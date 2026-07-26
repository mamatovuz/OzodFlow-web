import { AUDIT, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { PaymentProvider, TransactionType } from "@/lib/enums";
import type { Tiyin } from "@/lib/money";
import { credit, getOrCreateUserWallet } from "@/lib/wallet";

/**
 * TO'LOVLAR — hamyonni to'ldirish
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  HOZIRGI HOLAT — ochiq aytilgan
 *
 *  Click, Payme va Uzum integratsiyasi HALI YO'Q. Shu sababli to'ldirish
 *  QO'LDA tasdiqlanadi:
 *
 *    1. Mijoz so'rov yaratadi va unga TO'LOV KODI beriladi
 *    2. Mijoz bank/karta orqali o'tkazma qiladi, izohga kodni yozadi
 *    3. Admin o'tkazmani ko'rib, so'rovni tasdiqlaydi
 *    4. Hamyon to'ldiriladi
 *
 *  Bu vaqtinchalik yechim emas — kichik platformalar uchun to'liq ishlaydigan
 *  usul. Shlyuz qo'shilganda `confirmDeposit` webhook'dan chaqiriladi,
 *  qolgan mantiq o'zgarmaydi.
 *
 *  To'lov kodi MUHIM: usiz admin qaysi o'tkazma kimga tegishli ekanini
 *  aniqlay olmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "INVALID_STATE" | "INVALID_AMOUNT"
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * To'lov kodi — mijoz o'tkazma izohiga yozadigan qiymat.
 *
 * Qisqa va adashtirmaydigan alifbo: 0/O va 1/I yo'q, chunki bu kod
 * telefonda aytiladi va qo'lda ko'chiriladi.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generatePaymentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `TL-${code.slice(0, 4)}-${code.slice(4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// So'rov yaratish
// ─────────────────────────────────────────────────────────────────────────────

export async function requestDeposit(params: {
  userId: string;
  amount: Tiyin;
  method: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ id: string; code: string; amount: Tiyin }> {
  if (params.amount <= 0n) {
    throw new PaymentError("Summa noldan katta bo'lishi kerak", "INVALID_AMOUNT");
  }

  const code = generatePaymentCode();

  const payment = await db.payment.create({
    data: {
      userId: params.userId,
      provider: PaymentProvider.MANUAL,
      // `providerRef` — to'lov kodi. Admin o'tkazmani shu bo'yicha topadi.
      providerRef: code,
      amount: params.amount,
      status: "PENDING",
      rawJson: JSON.stringify({ requestedMethod: params.method }),
    },
    select: { id: true },
  });

  return { id: payment.id, code, amount: params.amount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin tasdig'i
// ─────────────────────────────────────────────────────────────────────────────

/**
 * To'lovni tasdiqlaydi va hamyonni to'ldiradi.
 *
 * Hamyon o'zgarishi va to'lov holati BITTA tranzaksiyada — aks holda
 * "to'lov tasdiqlandi, lekin pul tushmadi" holati bo'lishi mumkin edi.
 */
export async function confirmDeposit(params: {
  paymentId: string;
  adminId: string;
  note?: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ amount: Tiyin; userId: string }> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: params.paymentId },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        providerRef: true,
      },
    });

    if (!payment) {
      throw new PaymentError("To'lov topilmadi", "NOT_FOUND");
    }

    if (payment.status !== "PENDING") {
      throw new PaymentError(
        `To'lov "${payment.status}" holatida — faqat kutilayotgan to'lovni tasdiqlash mumkin`,
        "INVALID_STATE"
      );
    }

    const wallet = await getOrCreateUserWallet(tx, payment.userId);

    await credit(tx, wallet.id, payment.amount, {
      type: TransactionType.DEPOSIT,
      // Idempotentlik: bir to'lov ikki marta hisobga olinmaydi.
      reference: `payment:confirm:${payment.id}`,
      description: `Hamyon to'ldirildi — ${payment.providerRef ?? payment.id}`,
      meta: { paymentId: payment.id, confirmedBy: params.adminId },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.PAYMENT_RECEIVED,
        entityType: "Payment",
        entityId: payment.id,
        before: { status: "PENDING" },
        after: {
          status: "PAID",
          amount: payment.amount,
          userId: payment.userId,
          note: params.note ?? null,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return { amount: payment.amount, userId: payment.userId };
  });
}

/** To'lovni rad etadi (o'tkazma kelmadi yoki summa mos kelmadi). */
export async function rejectDeposit(params: {
  paymentId: string;
  adminId: string;
  reason: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: params.paymentId },
      select: { id: true, status: true, userId: true, amount: true },
    });

    if (!payment) {
      throw new PaymentError("To'lov topilmadi", "NOT_FOUND");
    }

    if (payment.status !== "PENDING") {
      throw new PaymentError("Bu to'lov allaqachon ko'rib chiqilgan", "INVALID_STATE");
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CANCELLED",
        rawJson: JSON.stringify({ rejectedReason: params.reason }),
      },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.PAYMENT_RECEIVED,
        entityType: "Payment",
        entityId: payment.id,
        after: { status: "CANCELLED", reason: params.reason },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// O'qish
// ─────────────────────────────────────────────────────────────────────────────

/** Foydalanuvchining kutilayotgan to'lov so'rovlari. */
export async function listPendingDeposits(userId: string) {
  return db.payment.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      providerRef: true,
      createdAt: true,
    },
  });
}

/** Admin uchun: barcha kutilayotgan to'lovlar. */
export async function listAllPendingDeposits() {
  return db.payment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      providerRef: true,
      provider: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}
