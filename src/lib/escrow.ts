import { AUDIT, writeAudit } from "@/lib/audit";
import { db, type DbClient } from "@/lib/db";
import {
  EscrowStatus,
  ProjectEventType,
  ProjectStatus,
  SystemWallet,
  TransactionType,
} from "@/lib/enums";
import {
  splitByShare,
  splitCommission,
  type Tiyin,
} from "@/lib/money";
import {
  WalletError,
  credit,
  getOrCreateUserWallet,
  getSystemWallet,
  lockFunds,
  spendLocked,
  unlockFunds,
} from "@/lib/wallet";

/**
 * ESCROW — mijoz puli ish qabul qilinmaguncha bloklangan turadi
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PUL QAYERDA TURADI
 *
 *  Escrow davomida pul MIJOZNING O'Z HAMYONIDA, `lockedBalance` maydonida
 *  turadi. Alohida "escrow hisobi" ga KO'CHIRILMAYDI.
 *
 *  Nega shunday:
 *    • mijoz o'z kabinetida "mening pulim, falon loyiha uchun bloklangan"
 *      deb ko'radi — mahsulot va'dasi aynan shu
 *    • bitta ko'chirish o'rniga bitta maydon o'zgaradi: kamroq qadam,
 *      kamroq xato ehtimoli (bu kodning eng xatarli qismi)
 *    • tekshirish oson: SUM(lockedBalance) === SUM(FUNDED escrow.amount)
 *
 *  `SystemWallet.ESCROW_HOLDING` hozircha ISHLATILMAYDI. U kelajakda
 *  ajratilgan hisob (segregated account) modeliga o'tish kerak bo'lsa
 *  qoldirilgan — masalan litsenziya talabi paydo bo'lsa. Hozir unga
 *  yozish faqat ikki marta hisoblashga olib kelardi.
 *
 *  Platforma komissiyasi esa HAQIQATAN ko'chiriladi —
 *  `SystemWallet.PLATFORM_REVENUE` hamyoniga.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  BARCHA amallar bitta DB tranzaksiyasida bajariladi. Yarim bajarilgan
 *  holat (pul mijozdan chiqdi, developerga tushmadi) BO'LISHI MUMKIN EMAS.
 */

export class EscrowError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "NO_AMOUNT"
      | "NO_DEVELOPER"
      | "ALREADY_DONE"
  ) {
    super(message);
    this.name = "EscrowError";
  }
}

export type EscrowActionResult = {
  escrowId: string;
  amount: Tiyin;
  developerAmount: Tiyin;
  commissionAmount: Tiyin;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. To'lash — mijoz pulini bloklash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loyiha uchun escrow'ni to'ldiradi.
 *
 * Bu qadam ish BOSHLANISHIDAN OLDIN bajariladi: developer pul bloklanganini
 * ko'rmaguncha ishga kirishmaydi.
 */
export async function fundEscrow(params: {
  projectId: string;
  actorId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<EscrowActionResult> {
  return db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: params.projectId },
      select: {
        id: true,
        publicId: true,
        title: true,
        status: true,
        customerId: true,
        assignedDeveloperId: true,
        agreedAmount: true,
        commissionBps: true,
        escrow: { select: { id: true, status: true } },
      },
    });

    if (!project) {
      throw new EscrowError("Loyiha topilmadi", "NOT_FOUND");
    }

    if (!project.assignedDeveloperId) {
      throw new EscrowError(
        "Escrow to'ldirishdan oldin mutaxassis tanlanishi kerak",
        "NO_DEVELOPER"
      );
    }

    if (project.agreedAmount === null || project.agreedAmount <= 0n) {
      throw new EscrowError(
        "Kelishilgan summa belgilanmagan",
        "NO_AMOUNT"
      );
    }

    // Allaqachon to'langan bo'lsa — takroriy so'rov, xato emas.
    if (project.escrow?.status === EscrowStatus.FUNDED) {
      throw new EscrowError("Escrow allaqachon to'ldirilgan", "ALREADY_DONE");
    }

    const amount = project.agreedAmount;
    const split = splitCommission(amount, project.commissionBps);

    // ── Escrow yozuvi ────────────────────────────────────────────────────
    const escrow = await tx.escrow.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        customerId: project.customerId,
        developerId: project.assignedDeveloperId,
        amount,
        commissionBps: project.commissionBps,
        commissionAmount: split.commission,
        developerAmount: split.net,
        status: EscrowStatus.FUNDED,
        fundedAt: new Date(),
      },
      update: {
        developerId: project.assignedDeveloperId,
        amount,
        commissionBps: project.commissionBps,
        commissionAmount: split.commission,
        developerAmount: split.net,
        status: EscrowStatus.FUNDED,
        fundedAt: new Date(),
      },
      select: { id: true },
    });

    // ── Mijoz pulini bloklash ────────────────────────────────────────────
    const customerWallet = await getOrCreateUserWallet(tx, project.customerId);

    await lockFunds(tx, customerWallet.id, amount, {
      type: TransactionType.ESCROW_HOLD,
      // Idempotentlik kaliti: takroriy so'rov unique constraint'ga uriladi.
      reference: `escrow:fund:${escrow.id}`,
      projectId: project.id,
      escrowId: escrow.id,
      description: `Escrow: ${project.publicId} — ${project.title}`,
    });

    // ── Loyiha holati ────────────────────────────────────────────────────
    await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        actorId: params.actorId,
        type: ProjectEventType.ESCROW_FUNDED,
        message: "To'lov escrow'da bloklandi, ish boshlandi",
      },
    });

    await writeAudit(
      {
        actorId: params.actorId,
        action: AUDIT.ESCROW_FUNDED,
        entityType: "Escrow",
        entityId: escrow.id,
        after: {
          projectId: project.id,
          amount,
          developerAmount: split.net,
          commissionAmount: split.commission,
          commissionBps: project.commissionBps,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return {
      escrowId: escrow.id,
      amount,
      developerAmount: split.net,
      commissionAmount: split.commission,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Chiqarish — mijoz ishni qabul qildi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escrow'ni taqsimlaydi: developer ulushi + platforma komissiyasi.
 *
 * Bu YAGONA joy pulning developerga o'tishi. Uch hamyon bitta
 * tranzaksiyada o'zgaradi:
 *
 *   mijoz.locked  −= amount           (pul hamyonni tark etadi)
 *   developer.balance += developerAmount
 *   platforma.balance += commissionAmount
 *
 * Yig'indi tekshiriladi: developerAmount + commissionAmount === amount.
 */
export async function releaseEscrow(params: {
  projectId: string;
  actorId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<EscrowActionResult> {
  return db.$transaction(async (tx) => {
    const escrow = await loadFundedEscrow(tx, params.projectId);

    if (!escrow.developerId) {
      throw new EscrowError("Escrow'da mutaxassis ko'rsatilmagan", "NO_DEVELOPER");
    }

    // Himoya: yozuv buzilgan bo'lsa pul yo'qolib ketmasin.
    if (escrow.developerAmount + escrow.commissionAmount !== escrow.amount) {
      throw new EscrowError(
        `Escrow buzilgan: ${escrow.developerAmount} + ${escrow.commissionAmount} !== ${escrow.amount}`,
        "INVALID_STATE"
      );
    }

    const customerWallet = await getOrCreateUserWallet(tx, escrow.customerId);
    const developerWallet = await getOrCreateUserWallet(tx, escrow.developerId);
    const platformWallet = await getSystemWallet(tx, SystemWallet.PLATFORM_REVENUE);

    // ── 1. Mijozdan chiqarish ────────────────────────────────────────────
    await spendLocked(tx, customerWallet.id, escrow.amount, {
      type: TransactionType.ESCROW_RELEASE,
      reference: `escrow:release:hold:${escrow.id}`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      description: `Escrow taqsimlandi: ${escrow.project.publicId}`,
    });

    // ── 2. Developerga ───────────────────────────────────────────────────
    await credit(tx, developerWallet.id, escrow.developerAmount, {
      type: TransactionType.ESCROW_RELEASE,
      reference: `escrow:release:dev:${escrow.id}`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      description: `Bajarilgan ish uchun to'lov: ${escrow.project.publicId}`,
    });

    // ── 3. Platformaga ───────────────────────────────────────────────────
    // Komissiya nol bo'lishi mumkin (0% aksiya) — o'shanda yozuv
    // yaratilmaydi, chunki `credit` nol summani rad etadi.
    if (escrow.commissionAmount > 0n) {
      await credit(tx, platformWallet.id, escrow.commissionAmount, {
        type: TransactionType.COMMISSION,
        reference: `escrow:release:fee:${escrow.id}`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        description: `Komissiya: ${escrow.project.publicId}`,
      });
    }

    // ── 4. Holatlar ──────────────────────────────────────────────────────
    const now = new Date();

    await tx.escrow.update({
      where: { id: escrow.id },
      data: { status: EscrowStatus.RELEASED, releasedAt: now },
    });

    await tx.project.update({
      where: { id: escrow.projectId },
      data: { status: ProjectStatus.COMPLETED, completedAt: now },
    });

    // ── 5. Statistika ────────────────────────────────────────────────────
    // Keshlangan ko'rsatkichlar — profil sahifasida har safar qayta
    // hisoblamaslik uchun.
    await tx.developerProfile.updateMany({
      where: { userId: escrow.developerId },
      data: {
        totalEarned: { increment: escrow.developerAmount },
        completedProjects: { increment: 1 },
      },
    });

    await tx.customerProfile.updateMany({
      where: { userId: escrow.customerId },
      data: {
        totalSpent: { increment: escrow.amount },
        projectsDone: { increment: 1 },
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: escrow.projectId,
        actorId: params.actorId,
        type: ProjectEventType.PAYMENT_RELEASED,
        message: "Ish qabul qilindi, to'lov taqsimlandi",
      },
    });

    await writeAudit(
      {
        actorId: params.actorId,
        action: AUDIT.ESCROW_RELEASED,
        entityType: "Escrow",
        entityId: escrow.id,
        before: { status: EscrowStatus.FUNDED },
        after: {
          status: EscrowStatus.RELEASED,
          amount: escrow.amount,
          developerAmount: escrow.developerAmount,
          commissionAmount: escrow.commissionAmount,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return {
      escrowId: escrow.id,
      amount: escrow.amount,
      developerAmount: escrow.developerAmount,
      commissionAmount: escrow.commissionAmount,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Qaytarish — ish bajarilmadi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escrow'ni mijozga qaytaradi.
 *
 * Bloklangan pul `balance` ga qaytadi — mijoz uni boshqa loyihaga
 * sarflashi yoki yechib olishi mumkin.
 */
export async function refundEscrow(params: {
  projectId: string;
  actorId: string;
  reason: string;
  /** Qismli qaytarish. Berilmasa — to'liq summa. */
  amount?: Tiyin;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<EscrowActionResult> {
  return db.$transaction(async (tx) => {
    const escrow = await loadFundedEscrow(tx, params.projectId);

    const refundAmount = params.amount ?? escrow.amount;

    if (refundAmount <= 0n || refundAmount > escrow.amount) {
      throw new EscrowError(
        `Qaytarish summasi noto'g'ri: ${refundAmount} (escrow: ${escrow.amount})`,
        "INVALID_STATE"
      );
    }

    const customerWallet = await getOrCreateUserWallet(tx, escrow.customerId);

    await unlockFunds(tx, customerWallet.id, refundAmount, {
      type: TransactionType.REFUND,
      reference: `escrow:refund:${escrow.id}`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      description: `Qaytarildi: ${escrow.project.publicId} — ${params.reason}`,
    });

    const isFull = refundAmount === escrow.amount;
    const now = new Date();

    await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: isFull
          ? EscrowStatus.REFUNDED
          : EscrowStatus.PARTIALLY_REFUNDED,
        refundedAmount: { increment: refundAmount },
        refundedAt: now,
      },
    });

    // To'liq qaytarilsa loyiha bekor qilinadi. Qismli qaytarishda loyiha
    // holati chaqiruvchi tomonidan boshqariladi (nizo yechimi).
    if (isFull) {
      await tx.project.update({
        where: { id: escrow.projectId },
        data: {
          status: ProjectStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: params.reason,
        },
      });
    }

    await tx.projectEvent.create({
      data: {
        projectId: escrow.projectId,
        actorId: params.actorId,
        type: ProjectEventType.CANCELLED,
        message: `Pul qaytarildi: ${params.reason}`,
      },
    });

    await writeAudit(
      {
        actorId: params.actorId,
        action: AUDIT.ESCROW_REFUNDED,
        entityType: "Escrow",
        entityId: escrow.id,
        after: { refundAmount, full: isFull, reason: params.reason },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return {
      escrowId: escrow.id,
      amount: refundAmount,
      developerAmount: 0n,
      commissionAmount: 0n,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Nizo yechimi — summani bo'lish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nizoda escrow'ni ikki tomon orasida bo'ladi.
 *
 * `customerShareBps` — mijozga qaytadigan ulush (5000 = 50%).
 * Qolgan qism developerga o'tadi, undan komissiya ushlanadi.
 *
 * Komissiya FAQAT developer oladigan qismdan olinadi: mijozga qaytgan
 * puldan komissiya ushlash adolatsiz bo'lardi (u xizmat olmadi).
 */
export async function resolveDisputeSplit(params: {
  projectId: string;
  customerShareBps: number;
  actorId: string;
  note: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{
  escrowId: string;
  customerAmount: Tiyin;
  developerAmount: Tiyin;
  commissionAmount: Tiyin;
}> {
  return db.$transaction(async (tx) => {
    const escrow = await loadFundedEscrow(tx, params.projectId);

    if (!escrow.developerId) {
      throw new EscrowError("Escrow'da mutaxassis ko'rsatilmagan", "NO_DEVELOPER");
    }

    const share = splitByShare(escrow.amount, params.customerShareBps);
    // Developer ulushidan komissiya ushlanadi.
    const developerSplit = splitCommission(
      share.developerAmount,
      escrow.commissionBps
    );

    const customerWallet = await getOrCreateUserWallet(tx, escrow.customerId);
    const developerWallet = await getOrCreateUserWallet(tx, escrow.developerId);
    const platformWallet = await getSystemWallet(tx, SystemWallet.PLATFORM_REVENUE);

    // ── Mijozga qaytadigan qism ──────────────────────────────────────────
    if (share.customerAmount > 0n) {
      await unlockFunds(tx, customerWallet.id, share.customerAmount, {
        type: TransactionType.REFUND,
        reference: `escrow:dispute:refund:${escrow.id}`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        description: `Nizo yechimi: qaytarildi — ${escrow.project.publicId}`,
      });
    }

    // ── Developerga o'tadigan qism ───────────────────────────────────────
    if (share.developerAmount > 0n) {
      await spendLocked(tx, customerWallet.id, share.developerAmount, {
        type: TransactionType.ESCROW_RELEASE,
        reference: `escrow:dispute:hold:${escrow.id}`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        description: `Nizo yechimi: taqsimlandi — ${escrow.project.publicId}`,
      });

      if (developerSplit.net > 0n) {
        await credit(tx, developerWallet.id, developerSplit.net, {
          type: TransactionType.ESCROW_RELEASE,
          reference: `escrow:dispute:dev:${escrow.id}`,
          projectId: escrow.projectId,
          escrowId: escrow.id,
          description: `Nizo yechimi bo'yicha to'lov: ${escrow.project.publicId}`,
        });
      }

      if (developerSplit.commission > 0n) {
        await credit(tx, platformWallet.id, developerSplit.commission, {
          type: TransactionType.COMMISSION,
          reference: `escrow:dispute:fee:${escrow.id}`,
          projectId: escrow.projectId,
          escrowId: escrow.id,
          description: `Komissiya (nizo): ${escrow.project.publicId}`,
        });
      }
    }

    const now = new Date();

    await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status:
          share.customerAmount > 0n
            ? EscrowStatus.PARTIALLY_REFUNDED
            : EscrowStatus.RELEASED,
        refundedAmount: share.customerAmount,
        releasedAt: now,
        ...(share.customerAmount > 0n ? { refundedAt: now } : {}),
      },
    });

    await tx.project.update({
      where: { id: escrow.projectId },
      data: {
        status:
          share.developerAmount > 0n
            ? ProjectStatus.COMPLETED
            : ProjectStatus.CANCELLED,
        ...(share.developerAmount > 0n
          ? { completedAt: now }
          : { cancelledAt: now, cancelReason: params.note }),
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: escrow.projectId,
        actorId: params.actorId,
        type: ProjectEventType.DISPUTE_RESOLVED,
        message: params.note,
      },
    });

    await writeAudit(
      {
        actorId: params.actorId,
        action: AUDIT.DISPUTE_RESOLVED,
        entityType: "Escrow",
        entityId: escrow.id,
        after: {
          customerShareBps: params.customerShareBps,
          customerAmount: share.customerAmount,
          developerAmount: developerSplit.net,
          commissionAmount: developerSplit.commission,
          note: params.note,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return {
      escrowId: escrow.id,
      customerAmount: share.customerAmount,
      developerAmount: developerSplit.net,
      commissionAmount: developerSplit.commission,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

/** To'ldirilgan escrow'ni yuklaydi va holatini tekshiradi. */
async function loadFundedEscrow(tx: DbClient, projectId: string) {
  const escrow = await tx.escrow.findUnique({
    where: { projectId },
    select: {
      id: true,
      projectId: true,
      customerId: true,
      developerId: true,
      amount: true,
      commissionBps: true,
      commissionAmount: true,
      developerAmount: true,
      status: true,
      project: { select: { publicId: true, title: true } },
    },
  });

  if (!escrow) {
    throw new EscrowError("Escrow topilmadi", "NOT_FOUND");
  }

  if (escrow.status !== EscrowStatus.FUNDED) {
    throw new EscrowError(
      `Escrow "${escrow.status}" holatida — bu amal faqat FUNDED holatida mumkin`,
      "INVALID_STATE"
    );
  }

  return escrow;
}

/**
 * Xatoni foydalanuvchiga ko'rsatiladigan xabarga aylantiradi.
 *
 * Texnik tafsilot (summalar, id'lar) chiqarilmaydi — u log'da qoladi.
 */
export function escrowErrorMessage(error: unknown): string {
  if (error instanceof WalletError) {
    switch (error.code) {
      case "INSUFFICIENT_FUNDS":
        return "Hamyoningizda mablag' yetarli emas. Avval hamyonni to'ldiring.";
      case "INSUFFICIENT_LOCKED":
        return "Bloklangan mablag' yetarli emas. Yordam xizmatiga murojaat qiling.";
      case "DUPLICATE":
        return "Bu amal allaqachon bajarilgan.";
      default:
        return "To'lov amalini bajarib bo'lmadi.";
    }
  }

  if (error instanceof EscrowError) {
    switch (error.code) {
      case "NO_DEVELOPER":
        return "Avval mutaxassis tanlanishi kerak.";
      case "NO_AMOUNT":
        return "Kelishilgan summa belgilanmagan.";
      case "ALREADY_DONE":
        return "Bu amal allaqachon bajarilgan.";
      case "NOT_FOUND":
        return "Ma'lumot topilmadi.";
      default:
        return "Amalni hozirgi holatda bajarib bo'lmaydi.";
    }
  }

  return "Kutilmagan xatolik. Qayta urinib ko'ring.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tekshiruv
// ─────────────────────────────────────────────────────────────────────────────

export type ReconciliationReport = {
  ok: boolean;
  /** Barcha FUNDED escrow'lar yig'indisi */
  expectedLocked: Tiyin;
  /** Hamyonlardagi bloklangan summa yig'indisi */
  actualLocked: Tiyin;
  difference: Tiyin;
};

/**
 * BUXGALTERIYA TEKSHIRUVI.
 *
 * Invariant: bloklangan pullar yig'indisi to'ldirilgan escrow'lar
 * yig'indisiga TENG bo'lishi kerak.
 *
 * Farq chiqsa — kodda xato bor va pul yo'qolgan yoki paydo bo'lgan.
 * Bu holat jimgina o'tib ketmasligi kerak, shuning uchun admin panelda
 * ko'rsatiladi va rejali tekshiruvda chaqiriladi.
 */
export async function reconcileEscrow(): Promise<ReconciliationReport> {
  const [escrowSum, walletSum] = await Promise.all([
    db.escrow.aggregate({
      where: { status: EscrowStatus.FUNDED },
      _sum: { amount: true },
    }),
    db.wallet.aggregate({ _sum: { lockedBalance: true } }),
  ]);

  const expectedLocked = escrowSum._sum.amount ?? 0n;
  const actualLocked = walletSum._sum.lockedBalance ?? 0n;

  return {
    ok: expectedLocked === actualLocked,
    expectedLocked,
    actualLocked,
    difference: actualLocked - expectedLocked,
  };
}
