import { Prisma } from "@prisma/client";

import { db, type DbClient } from "@/lib/db";
import {
  SystemWallet,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@/lib/enums";
import { env } from "@/lib/env";
import type { Tiyin } from "@/lib/money";

/**
 * HAMYON — pul harakatining YAGONA ruxsat etilgan yo'li
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BUZILMAS QOIDALAR
 *
 *  1. `Wallet.balance` ni TO'G'RIDAN-TO'G'RI yozish TAQIQLANADI.
 *     Har o'zgarish shu fayldagi funksiyalar orqali bo'ladi va har biri
 *     `WalletTransaction` yozuvini yaratadi. Jurnalsiz o'zgargan balansni
 *     keyin tekshirib bo'lmaydi — nizoda kim haq ekanini aniqlash
 *     imkonsiz bo'lib qoladi.
 *
 *  2. Har bir amal TRANZAKSIYA ichida bo'lishi shart. Shuning uchun barcha
 *     funksiyalar `tx` (DbClient) qabul qiladi va o'zi tranzaksiya
 *     ochmaydi — chaqiruvchi bir necha hamyonni bitta atomik amalda
 *     o'zgartira olishi kerak (escrow taqsimoti aynan shunday).
 *
 *  3. Har amalning IDEMPOTENTLIK KALITI bor (`reference`, unique).
 *     Takroriy so'rov (tarmoq uzildi, foydalanuvchi ikki marta bosdi)
 *     pulni ikki marta o'tkazmaydi — ikkinchi urinish unique constraint
 *     xatosiga uchraydi va biz uni "allaqachon bajarilgan" deb qabul
 *     qilamiz.
 *
 *  4. Summa har doim MUSBAT. Yo'nalish `direction` maydonida.
 *     Manfiy summa bilan "kredit" qilish debit bo'lib qolardi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Xatolar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pul amallarining xatolari alohida sinf: chaqiruvchi ularni oddiy
 * texnik xatolardan ajrata olishi va foydalanuvchiga tushunarli xabar
 * ko'rsatishi kerak.
 */
export class WalletError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INSUFFICIENT_FUNDS"
      | "INSUFFICIENT_LOCKED"
      | "INVALID_AMOUNT"
      | "WALLET_NOT_FOUND"
      | "DUPLICATE"
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/** Prisma unique constraint xatosini aniqlaydi. */
function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hamyonni topish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Foydalanuvchi hamyonini oladi, bo'lmasa yaratadi.
 *
 * Hamyon odatda ro'yxatdan o'tishda yaratiladi, lekin eski hisoblar yoki
 * seed orqali kelgan foydalanuvchilarda bo'lmasligi mumkin. Pul amali
 * "hamyon topilmadi" deb yiqilmasligi kerak.
 */
export async function getOrCreateUserWallet(
  tx: DbClient,
  userId: string
): Promise<{ id: string; balance: Tiyin; lockedBalance: Tiyin }> {
  const existing = await tx.wallet.findUnique({
    where: { userId },
    select: { id: true, balance: true, lockedBalance: true },
  });

  if (existing) return existing;

  return tx.wallet.create({
    data: { userId, currency: env.DEFAULT_CURRENCY },
    select: { id: true, balance: true, lockedBalance: true },
  });
}

/** Tizim hamyoni (platforma daromadi, escrow hisobi). */
export async function getSystemWallet(
  tx: DbClient,
  systemKey: SystemWallet
): Promise<{ id: string; balance: Tiyin; lockedBalance: Tiyin }> {
  const existing = await tx.wallet.findUnique({
    where: { systemKey },
    select: { id: true, balance: true, lockedBalance: true },
  });

  if (existing) return existing;

  return tx.wallet.create({
    data: { systemKey, currency: env.DEFAULT_CURRENCY },
    select: { id: true, balance: true, lockedBalance: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tranzaksiya yozuvi
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerEntry = {
  type: TransactionType;
  /**
   * Idempotentlik kaliti. Bir xil amal uchun bir xil bo'lishi SHART:
   * `escrow:fund:<escrowId>`, `withdrawal:pay:<withdrawalId>`.
   *
   * Tasodifiy qiymat berilsa idempotentlik ishlamaydi.
   */
  reference: string;
  projectId?: string | null;
  escrowId?: string | null;
  description?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Summani tekshiradi — musbat va nol emas. */
function assertPositive(amount: Tiyin): void {
  if (amount <= 0n) {
    throw new WalletError(
      `Summa musbat bo'lishi kerak, berilgan: ${amount}`,
      "INVALID_AMOUNT"
    );
  }
}

/**
 * Tranzaksiya yozuvini yaratadi.
 *
 * `balanceAfter` — amaldan keyingi ISHLATSA BO'LADIGAN balans
 * (`Wallet.balance`). Bloklangan summa alohida maydonda va bu qiymatga
 * kirmaydi: hisobot o'qiyotgan odam "qo'limda qancha bor" degan savolga
 * javob izlaydi.
 */
async function writeLedger(
  tx: DbClient,
  params: {
    walletId: string;
    direction: TransactionDirection;
    amount: Tiyin;
    balanceAfter: Tiyin;
    entry: LedgerEntry;
  }
): Promise<void> {
  try {
    await tx.walletTransaction.create({
      data: {
        walletId: params.walletId,
        type: params.entry.type,
        direction: params.direction,
        amount: params.amount,
        balanceAfter: params.balanceAfter,
        status: TransactionStatus.COMPLETED,
        reference: params.entry.reference,
        projectId: params.entry.projectId ?? null,
        escrowId: params.entry.escrowId ?? null,
        description: params.entry.description ?? null,
        metaJson: params.entry.meta ? JSON.stringify(params.entry.meta) : null,
      },
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      throw new WalletError(
        `Bu amal allaqachon bajarilgan (reference: ${params.entry.reference})`,
        "DUPLICATE"
      );
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Asosiy amallar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hamyonga pul qo'shadi (depozit, escrow'dan tushum, bonus).
 */
export async function credit(
  tx: DbClient,
  walletId: string,
  amount: Tiyin,
  entry: LedgerEntry
): Promise<Tiyin> {
  assertPositive(amount);

  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { increment: amount },
      totalIn: { increment: amount },
    },
    select: { balance: true },
  });

  await writeLedger(tx, {
    walletId,
    direction: TransactionDirection.IN,
    amount,
    balanceAfter: wallet.balance,
    entry,
  });

  return wallet.balance;
}

/**
 * Hamyondan pul yechadi (yechib olish, to'lov).
 *
 * Mablag' yetishmasa xato tashlaydi VA hech narsa o'zgarmaydi — tekshiruv
 * yozishdan oldin bajariladi va hammasi bitta tranzaksiyada.
 */
export async function debit(
  tx: DbClient,
  walletId: string,
  amount: Tiyin,
  entry: LedgerEntry
): Promise<Tiyin> {
  assertPositive(amount);

  const current = await tx.wallet.findUnique({
    where: { id: walletId },
    select: { balance: true },
  });

  if (!current) {
    throw new WalletError("Hamyon topilmadi", "WALLET_NOT_FOUND");
  }

  if (current.balance < amount) {
    throw new WalletError(
      `Mablag' yetarli emas: kerak ${amount}, mavjud ${current.balance}`,
      "INSUFFICIENT_FUNDS"
    );
  }

  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { decrement: amount },
      totalOut: { increment: amount },
    },
    select: { balance: true },
  });

  await writeLedger(tx, {
    walletId,
    direction: TransactionDirection.OUT,
    amount,
    balanceAfter: wallet.balance,
    entry,
  });

  return wallet.balance;
}

/**
 * Mablag'ni BLOKLAYDI: `balance` dan `lockedBalance` ga ko'chiradi.
 *
 * Escrow'ning asosi. Pul foydalanuvchi hamyonida qoladi, lekin u endi
 * uni sarflay olmaydi — loyiha tugagunicha bloklangan turadi.
 *
 * `totalOut` OSHMAYDI: pul hali hamyondan chiqmagan, faqat bloklangan.
 */
export async function lockFunds(
  tx: DbClient,
  walletId: string,
  amount: Tiyin,
  entry: LedgerEntry
): Promise<{ balance: Tiyin; lockedBalance: Tiyin }> {
  assertPositive(amount);

  const current = await tx.wallet.findUnique({
    where: { id: walletId },
    select: { balance: true },
  });

  if (!current) {
    throw new WalletError("Hamyon topilmadi", "WALLET_NOT_FOUND");
  }

  if (current.balance < amount) {
    throw new WalletError(
      `Mablag' yetarli emas: kerak ${amount}, mavjud ${current.balance}`,
      "INSUFFICIENT_FUNDS"
    );
  }

  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { decrement: amount },
      lockedBalance: { increment: amount },
    },
    select: { balance: true, lockedBalance: true },
  });

  await writeLedger(tx, {
    walletId,
    direction: TransactionDirection.OUT,
    amount,
    balanceAfter: wallet.balance,
    entry,
  });

  return wallet;
}

/**
 * Bloklangan mablag'ni ISHLATSA BO'LADIGAN holatga qaytaradi.
 *
 * Loyiha bekor qilinganda yoki pul qaytarilganda.
 */
export async function unlockFunds(
  tx: DbClient,
  walletId: string,
  amount: Tiyin,
  entry: LedgerEntry
): Promise<{ balance: Tiyin; lockedBalance: Tiyin }> {
  assertPositive(amount);

  const current = await tx.wallet.findUnique({
    where: { id: walletId },
    select: { lockedBalance: true },
  });

  if (!current) {
    throw new WalletError("Hamyon topilmadi", "WALLET_NOT_FOUND");
  }

  if (current.lockedBalance < amount) {
    throw new WalletError(
      `Bloklangan mablag' yetarli emas: kerak ${amount}, mavjud ${current.lockedBalance}`,
      "INSUFFICIENT_LOCKED"
    );
  }

  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: {
      lockedBalance: { decrement: amount },
      balance: { increment: amount },
    },
    select: { balance: true, lockedBalance: true },
  });

  await writeLedger(tx, {
    walletId,
    direction: TransactionDirection.IN,
    amount,
    balanceAfter: wallet.balance,
    entry,
  });

  return wallet;
}

/**
 * Bloklangan mablag'ni HAMYONDAN CHIQARADI.
 *
 * Loyiha muvaffaqiyatli tugaganda: mijozning bloklangan puli endi
 * developer va platformaga o'tadi, ya'ni mijoz hamyonini butunlay tark
 * etadi.
 *
 * `balance` ga QAYTMAYDI — aks holda mijoz pulni qayta sarflay olardi.
 */
export async function spendLocked(
  tx: DbClient,
  walletId: string,
  amount: Tiyin,
  entry: LedgerEntry
): Promise<{ balance: Tiyin; lockedBalance: Tiyin }> {
  assertPositive(amount);

  const current = await tx.wallet.findUnique({
    where: { id: walletId },
    select: { lockedBalance: true },
  });

  if (!current) {
    throw new WalletError("Hamyon topilmadi", "WALLET_NOT_FOUND");
  }

  if (current.lockedBalance < amount) {
    throw new WalletError(
      `Bloklangan mablag' yetarli emas: kerak ${amount}, mavjud ${current.lockedBalance}`,
      "INSUFFICIENT_LOCKED"
    );
  }

  const wallet = await tx.wallet.update({
    where: { id: walletId },
    data: {
      lockedBalance: { decrement: amount },
      totalOut: { increment: amount },
    },
    select: { balance: true, lockedBalance: true },
  });

  await writeLedger(tx, {
    walletId,
    direction: TransactionDirection.OUT,
    amount,
    balanceAfter: wallet.balance,
    entry,
  });

  return wallet;
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish
// ─────────────────────────────────────────────────────────────────────────────

export type WalletSummary = {
  id: string;
  balance: Tiyin;
  lockedBalance: Tiyin;
  pendingBalance: Tiyin;
  totalIn: Tiyin;
  totalOut: Tiyin;
  currency: string;
};

export async function getWalletSummary(userId: string): Promise<WalletSummary | null> {
  return db.wallet.findUnique({
    where: { userId },
    select: {
      id: true,
      balance: true,
      lockedBalance: true,
      pendingBalance: true,
      totalIn: true,
      totalOut: true,
      currency: true,
    },
  });
}

export type LedgerPage = {
  items: Array<{
    id: string;
    type: string;
    direction: string;
    amount: Tiyin;
    balanceAfter: Tiyin;
    description: string | null;
    createdAt: Date;
    project: { publicId: string; title: string } | null;
  }>;
  hasMore: boolean;
};

/**
 * Tranzaksiyalar tarixi.
 *
 * Kursor bo'yicha sahifalash (offset emas): yangi tranzaksiya qo'shilganda
 * offset asosidagi sahifalash yozuvlarni takrorlaydi yoki o'tkazib
 * yuboradi.
 */
export async function getLedgerPage(
  walletId: string,
  options: { cursor?: string; take?: number } = {}
): Promise<LedgerPage> {
  const take = Math.min(options.take ?? 20, 100);

  const rows = await db.walletTransaction.findMany({
    where: { walletId },
    orderBy: { createdAt: "desc" },
    // Bittasini ortiq olamiz — keyingi sahifa borligini shundan bilamiz.
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      direction: true,
      amount: true,
      balanceAfter: true,
      description: true,
      createdAt: true,
      project: { select: { publicId: true, title: true } },
    },
  });

  return {
    items: rows.slice(0, take),
    hasMore: rows.length > take,
  };
}
