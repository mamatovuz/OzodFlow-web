import { AUDIT, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { PaymentProvider, TransactionType } from "@/lib/enums";
import { formatMoney, type Tiyin } from "@/lib/money";
import {
  CheckoutError,
  createCheckoutPayment,
  getCheckoutPaymentStatus,
  isCheckoutConfigured,
  type CheckoutPaymentStatus,
} from "@/lib/payments/checkout-uz";
import { SITE } from "@/lib/site";
import { credit, getOrCreateUserWallet } from "@/lib/wallet";

/**
 * HAMYONNI TO'LDIRISH
 *
 * Ikki yo'l bor va ikkalasi ham ishlaydi:
 *
 *   1. SHLYUZ (CHECKOUT.UZ) — asosiy yo'l. Mijoz to'lov sahifasiga
 *      o'tadi, karta bilan to'laydi, webhook kelgach hamyon to'ldiriladi.
 *
 *   2. QO'LDA — zaxira yo'l. Mijoz to'lov kodi oladi, bank o'tkazmasi
 *      qiladi, admin tasdiqlaydi. Shlyuz sozlanmagan yoki katta summa
 *      uchun (shlyuz limiti 10 mln so'm) kerak bo'ladi.
 */

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "INVALID_AMOUNT"
      | "AMOUNT_MISMATCH"
      | "NOT_PAID"
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * To'lov kodi — mijoz o'tkazma izohiga yozadigan qiymat (qo'lda yo'l).
 *
 * Adashtirmaydigan alifbo: 0/O va 1/I yo'q, chunki kod telefonda
 * aytiladi va qo'lda ko'chiriladi.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generatePaymentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]
  ).join("");
  return `TL-${code.slice(0, 4)}-${code.slice(4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Shlyuz orqali to'ldirish
// ─────────────────────────────────────────────────────────────────────────────

export type GatewayDeposit = {
  paymentId: string;
  /** Mijoz yo'naltiriladigan to'lov sahifasi */
  paymentUrl: string;
  amount: Tiyin;
};

/**
 * Shlyuzda to'lov havolasi yaratadi va lokal yozuv qo'yadi.
 *
 * TARTIB MUHIM: avval shlyuzda invoys yaratiladi, keyin lokal yozuv.
 * Teskari tartibda bo'lsa, shlyuz xato bersa bizda "osilgan" PENDING
 * yozuv qolardi va mijoz uni to'lay olmasdi.
 */
export async function startGatewayDeposit(params: {
  userId: string;
  amount: Tiyin;
  userName: string;
}): Promise<GatewayDeposit> {
  if (!isCheckoutConfigured()) {
    throw new CheckoutError("Shlyuz sozlanmagan", "NOT_CONFIGURED");
  }

  const invoice = await createCheckoutPayment({
    amount: params.amount,
    description: `OzodFlow hamyon — ${params.userName}`,
    /**
     * Webhook manzili so'rov bilan birga yuboriladi.
     *
     * Kassa sozlamalarida ham umumiy manzil bor, lekin uni bu yerda
     * aniq ko'rsatish muhim: shunda manzil KODDA turadi va deploy
     * paytida panel sozlamasiga bog'liq bo'lmaydi.
     */
    webhookUrl: `${SITE.url}/webhook/tolov`,
  });

  const payment = await db.payment.create({
    data: {
      userId: params.userId,
      provider: PaymentProvider.CHECKOUT,
      // Webhook'dagi `data.order_id` aynan shu qiymat bo'ladi — lokal
      // yozuvni topish kaliti.
      providerRef: String(invoice.invoiceId),
      amount: params.amount,
      status: "PENDING",
      rawJson: JSON.stringify({
        uuid: invoice.uuid,
        paymentUrl: invoice.paymentUrl,
        payVia: invoice.payVia,
        expiresInSeconds: invoice.expiresInSeconds,
      }),
    },
    select: { id: true },
  });

  return {
    paymentId: payment.id,
    paymentUrl: invoice.paymentUrl,
    amount: params.amount,
  };
}

export type SettleResult =
  | { status: "credited"; amount: Tiyin; userId: string }
  /** Allaqachon hisobga olingan — takroriy webhook */
  | { status: "already_settled" }
  /** Lokal yozuv topilmadi — bizga tegishli bo'lmagan invoys */
  | { status: "unknown_invoice" }
  /** Shlyuz "to'langan" demadi */
  | { status: "not_paid"; gatewayStatus: string };

/**
 * Shlyuzdagi to'lovni yopadi va hamyonni to'ldiradi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  XAVFSIZLIK: WEBHOOK TANASIGA ISHONILMAYDI
 *
 *  CHECKOUT.UZ webhook'ida imzo yo'q. Shuning uchun bu funksiya
 *  webhook'dan FAQAT `invoiceId` ni oladi va qolgan hammasini
 *  shlyuzning o'zidan so'raydi:
 *
 *    • to'lov haqiqatan "paid" holatidami
 *    • summa lokal yozuvdagi summaga tengmi
 *
 *  Shunda soxta webhook hech narsa qilmaydi: u faqat bizni shlyuzga
 *  so'rov yuborishga majbur qiladi, shlyuz esa "pending" deb javob
 *  beradi va pul qo'shilmaydi.
 *
 *  Bu funksiya WEBHOOK'SIZ ham chaqirilishi mumkin (mijoz "tekshirish"
 *  tugmasini bosganda, yoki reja bo'yicha) — natija bir xil bo'ladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function settleCheckoutPayment(params: {
  invoiceId: number;
  /** Webhook'dan kelgan qo'shimcha ma'lumot — faqat log uchun */
  webhookPayload?: unknown;
  /**
   * Shlyuzdan holat so'rovchi funksiya.
   *
   * ISHLAB CHIQARISHDA HECH QACHON BERILMAYDI — standart qiymat
   * haqiqiy CHECKOUT.UZ so'rovi. Faqat testlarda almashtiriladi,
   * chunki testlar tashqi tarmoqqa chiqmasligi kerak: aks holda
   * "soxta webhook pul qo'shmaydi" degan xususiyatni tekshirish
   * uchun haqiqiy to'lov qilish kerak bo'lardi.
   */
  verify?: (invoiceId: number) => Promise<CheckoutPaymentStatus>;
}): Promise<SettleResult> {
  const providerRef = String(params.invoiceId);
  const verify = params.verify ?? getCheckoutPaymentStatus;

  const payment = await db.payment.findFirst({
    where: { provider: PaymentProvider.CHECKOUT, providerRef },
    select: { id: true, userId: true, amount: true, status: true },
  });

  if (!payment) {
    return { status: "unknown_invoice" };
  }

  // Idempotentlik: takroriy webhook hech narsa qilmaydi.
  if (payment.status === "PAID") {
    return { status: "already_settled" };
  }

  if (payment.status !== "PENDING") {
    // Bekor qilingan yoki xato holatidagi to'lovni tiriltirmaymiz.
    return { status: "not_paid", gatewayStatus: payment.status };
  }

  // ── MUSTAQIL TASDIQ ────────────────────────────────────────────────────
  const gateway = await verify(params.invoiceId);

  if (!gateway.isPaid) {
    return { status: "not_paid", gatewayStatus: gateway.status };
  }

  // ── Summa mosligi ──────────────────────────────────────────────────────
  // Shlyuz so'mda, bizda tiyinda. Mos kelmasa — bu jiddiy holat:
  // yoki soxta so'rov, yoki shlyuz tomonida xato. Pul qo'shmaymiz.
  const gatewayTiyin = BigInt(Math.round(gateway.amountSum)) * 100n;

  if (gatewayTiyin !== payment.amount) {
    await writeAudit({
      actorId: payment.userId,
      action: AUDIT.PAYMENT_RECEIVED,
      entityType: "Payment",
      entityId: payment.id,
      after: {
        error: "amount_mismatch",
        expected: payment.amount.toString(),
        gateway: gatewayTiyin.toString(),
      },
    });

    throw new PaymentError(
      `Summa mos kelmadi: kutilgan ${payment.amount}, shlyuzda ${gatewayTiyin}`,
      "AMOUNT_MISMATCH"
    );
  }

  // ── Hamyonni to'ldirish ────────────────────────────────────────────────
  return db.$transaction(async (tx) => {
    // Tranzaksiya ichida holatni QAYTA tekshiramiz: shu vaqt oralig'ida
    // boshqa webhook uni yopib qo'ygan bo'lishi mumkin.
    const fresh = await tx.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    if (fresh?.status !== "PENDING") {
      return { status: "already_settled" as const };
    }

    const wallet = await getOrCreateUserWallet(tx, payment.userId);

    await credit(tx, wallet.id, payment.amount, {
      type: TransactionType.DEPOSIT,
      // Idempotentlik kaliti — bir to'lov ikki marta hisoblanmaydi.
      reference: `payment:checkout:${payment.id}`,
      description: `Hamyon to'ldirildi — CHECKOUT.UZ #${params.invoiceId}`,
      meta: { invoiceId: params.invoiceId },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: gateway.paidAt ?? new Date(),
        rawJson: JSON.stringify({
          gateway: {
            status: gateway.status,
            amountSum: gateway.amountSum,
            paidAt: gateway.paidAt?.toISOString() ?? null,
          },
          webhook: params.webhookPayload ?? null,
        }),
      },
    });

    await writeAudit(
      {
        actorId: payment.userId,
        action: AUDIT.PAYMENT_RECEIVED,
        entityType: "Payment",
        entityId: payment.id,
        before: { status: "PENDING" },
        after: {
          status: "PAID",
          amount: payment.amount,
          provider: PaymentProvider.CHECKOUT,
          invoiceId: params.invoiceId,
        },
      },
      tx
    );

    return {
      status: "credited" as const,
      amount: payment.amount,
      userId: payment.userId,
    };
  });
}

/**
 * Mijozning kutilayotgan shlyuz to'lovlarini tekshiradi.
 *
 * Webhook yetib kelmasligi mumkin (tarmoq, deploy paytidagi to'xtash).
 * Shu sababli mijoz hamyon sahifasida "tekshirish" tugmasini bosganda
 * holat shlyuzdan qayta so'raladi — u pulini kutib qolmasligi kerak.
 */
export async function recheckPendingGatewayPayments(
  userId: string,
  /** Faqat testlar uchun — `settleCheckoutPayment` izohiga qarang. */
  verify?: (invoiceId: number) => Promise<CheckoutPaymentStatus>
): Promise<{ credited: number; total: Tiyin }> {
  const pending = await db.payment.findMany({
    where: {
      userId,
      provider: PaymentProvider.CHECKOUT,
      status: "PENDING",
    },
    select: { providerRef: true },
    take: 20,
  });

  let credited = 0;
  let total = 0n;

  for (const payment of pending) {
    const invoiceId = Number(payment.providerRef);
    if (!Number.isInteger(invoiceId)) continue;

    try {
      const result = await settleCheckoutPayment({ invoiceId, verify });

      if (result.status === "credited") {
        credited += 1;
        total += result.amount;
      }
    } catch (error) {
      // Bitta to'lov xato bersa qolganlari tekshirilishda davom etadi.
      console.error(`[payments] Invoys ${invoiceId} tekshirilmadi:`, error);
    }
  }

  return { credited, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Qo'lda to'ldirish (zaxira yo'l)
// ─────────────────────────────────────────────────────────────────────────────

export async function requestManualDeposit(params: {
  userId: string;
  amount: Tiyin;
  method: string;
}): Promise<{ id: string; code: string; amount: Tiyin }> {
  if (params.amount <= 0n) {
    throw new PaymentError("Summa noldan katta bo'lishi kerak", "INVALID_AMOUNT");
  }

  const code = generatePaymentCode();

  const payment = await db.payment.create({
    data: {
      userId: params.userId,
      provider: PaymentProvider.MANUAL,
      providerRef: code,
      amount: params.amount,
      status: "PENDING",
      rawJson: JSON.stringify({ requestedMethod: params.method }),
    },
    select: { id: true },
  });

  return { id: payment.id, code, amount: params.amount };
}

/** Admin qo'lda kelgan o'tkazmani tasdiqlaydi. */
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
      select: { id: true, status: true },
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

export type PendingDeposit = {
  id: string;
  amount: Tiyin;
  amountLabel: string;
  provider: string;
  code: string | null;
  paymentUrl: string | null;
  createdAt: Date;
};

/** Foydalanuvchining kutilayotgan to'lov so'rovlari. */
export async function listPendingDeposits(
  userId: string
): Promise<PendingDeposit[]> {
  const payments = await db.payment.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      amount: true,
      provider: true,
      providerRef: true,
      rawJson: true,
      createdAt: true,
    },
  });

  return payments.map((payment) => {
    // Shlyuz to'lovlarida to'lov havolasi `rawJson` da saqlangan —
    // mijoz to'lovni tugatmagan bo'lsa unga qaytish imkoni bo'lishi kerak.
    let paymentUrl: string | null = null;

    if (payment.provider === PaymentProvider.CHECKOUT && payment.rawJson) {
      try {
        const parsed = JSON.parse(payment.rawJson) as { paymentUrl?: string };
        paymentUrl = parsed.paymentUrl ?? null;
      } catch {
        paymentUrl = null;
      }
    }

    return {
      id: payment.id,
      amount: payment.amount,
      amountLabel: formatMoney(payment.amount),
      provider: payment.provider,
      code:
        payment.provider === PaymentProvider.MANUAL ? payment.providerRef : null,
      paymentUrl,
      createdAt: payment.createdAt,
    };
  });
}

/** Admin uchun: qo'lda tasdiq kutayotgan to'lovlar. */
export async function listAllPendingDeposits() {
  return db.payment.findMany({
    where: { status: "PENDING", provider: PaymentProvider.MANUAL },
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
