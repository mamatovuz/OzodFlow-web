import { env } from "@/lib/env";
import type { Tiyin } from "@/lib/money";

/**
 * CHECKOUT.UZ — to'lov shlyuzi klienti
 *
 * Hujjat: https://checkout.uz/api/v1
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BIRLIK: CHECKOUT.UZ SO'M BILAN ISHLAYDI
 *
 *  Bizning tizimda pul TIYINDA (`bigint`). Shlyuz esa butun SO'M kutadi
 *  (`amount: 50000`). Aylantirish faqat SHU faylda bajariladi — boshqa
 *  joyda tiyin qoladi.
 *
 *  Tiyin qoldig'i bo'lgan summa (masalan 1500,50 so'm) shlyuzga
 *  yuborilmaydi: u kasr qabul qilmaydi va yaxlitlash mijozning pulini
 *  yo'qotardi. Bunday summa RAD ETILADI.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Shlyuz cheklovlari (hujjatdan):
 *    • minimal: 1 000 so'm
 *    • maksimal: 10 000 000 so'm
 */

const API_BASE = "https://checkout.uz/api/v1";

/** Shlyuz cheklovlari — so'mda. */
export const CHECKOUT_MIN_SUM = 1_000;
export const CHECKOUT_MAX_SUM = 10_000_000;

/**
 * So'rov kutish muddati.
 *
 * Cheklovsiz `fetch` osilib qolsa, foydalanuvchi cheksiz kutadi va
 * server ulanishlari to'planib ketadi.
 */
const REQUEST_TIMEOUT_MS = 15_000;

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_CONFIGURED"
      | "AMOUNT_TOO_SMALL"
      | "AMOUNT_TOO_LARGE"
      | "FRACTIONAL_AMOUNT"
      | "NETWORK"
      /** Kassa kaliti noto'g'ri yoki muddati o'tgan (HTTP 401/403) */
      | "UNAUTHORIZED"
      | "API_ERROR"
      | "BAD_RESPONSE",
    /** Shlyuzdan kelgan xom javob — log uchun */
    readonly details?: unknown
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/** Shlyuz sozlanganmi. Sozlanmagan bo'lsa qo'lda to'ldirishga o'tiladi. */
export function isCheckoutConfigured(): boolean {
  return Boolean(env.CHECKOUT_API_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// So'rov yuborish
// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = env.CHECKOUT_API_KEY;

  if (!apiKey) {
    throw new CheckoutError(
      "CHECKOUT_API_KEY sozlanmagan",
      "NOT_CONFIGURED"
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Tana bo'lmasa ham `POST` yuboriladi — /get_balance kabi
      // endpointlar tana talab qilmaydi.
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // To'lov so'rovi hech qachon keshlanmaydi.
      cache: "no-store",
    });
  } catch (error) {
    throw new CheckoutError(
      `Shlyuzga ulanib bo'lmadi: ${endpoint}`,
      "NETWORK",
      error
    );
  }

  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CheckoutError(
      `Shlyuz JSON bo'lmagan javob qaytardi (${response.status})`,
      "BAD_RESPONSE",
      text.slice(0, 500)
    );
  }

  if (!response.ok) {
    /**
     * 401/403 ni ALOHIDA ajratamiz.
     *
     * Bu boshqa xatolardan tubdan farq qiladi: qayta urinish yordam
     * bermaydi va mijoz hech narsa qila olmaydi — kalit noto'g'ri.
     * Log'da ham darhol ko'rinishi kerak, aks holda "to'lov ishlamayapti"
     * degan xabar uzoq vaqt tekshiriladi.
     */
    if (response.status === 401 || response.status === 403) {
      console.error(
        `[checkout] Kassa kaliti rad etildi (${response.status}) — ` +
          `CHECKOUT_API_KEY ni tekshiring. Endpoint: ${endpoint}`
      );

      throw new CheckoutError(
        `Kassa kaliti rad etildi (${response.status})`,
        "UNAUTHORIZED",
        parsed
      );
    }

    throw new CheckoutError(
      `Shlyuz xato qaytardi (${response.status})`,
      "API_ERROR",
      parsed
    );
  }

  // Shlyuz HTTP 200 bilan ham `status: "error"` qaytarishi mumkin —
  // faqat status kodiga ishonmaymiz.
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "status" in parsed &&
    parsed.status !== "success"
  ) {
    throw new CheckoutError("Shlyuz so'rovni rad etdi", "API_ERROR", parsed);
  }

  return parsed as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// To'lov yaratish
// ─────────────────────────────────────────────────────────────────────────────

type CreatePaymentResponse = {
  status: string;
  payment: {
    _id: number;
    _uuid: string;
    _url: string;
    _amount: number;
    _status: string;
    _pay_via?: Record<string, string>;
    _lifteme?: { _second: number; _hour: number };
  };
};

export type CheckoutInvoice = {
  /** Shlyuzdagi invoys ID — webhook'da `data.order_id` shu qiymat */
  invoiceId: number;
  uuid: string;
  /** Mijoz yo'naltiriladigan to'lov sahifasi */
  paymentUrl: string;
  /** So'mdagi summa (shlyuz qaytargan) */
  amountSum: number;
  /** To'g'ridan-to'g'ri havolalar: click, payme va h.k. */
  payVia: Record<string, string>;
  /** Havola amal qilish muddati (sekund) */
  expiresInSeconds: number | null;
};

/**
 * Yangi to'lov havolasi yaratadi.
 *
 * `amount` — TIYINDA. Ichida so'mga aylantiriladi.
 */
export async function createCheckoutPayment(params: {
  amount: Tiyin;
  description: string;
  webhookUrl?: string;
}): Promise<CheckoutInvoice> {
  // ── Summani tekshirish ────────────────────────────────────────────────
  // Tiyin qoldig'i bo'lsa yaxlitlash kerak bo'ladi — bu mijozning
  // pulini yo'qotadi yoki qo'shadi. Bunday summani qabul qilmaymiz.
  if (params.amount % 100n !== 0n) {
    throw new CheckoutError(
      "Shlyuz faqat butun so'mni qabul qiladi",
      "FRACTIONAL_AMOUNT"
    );
  }

  const amountSum = Number(params.amount / 100n);

  if (amountSum < CHECKOUT_MIN_SUM) {
    throw new CheckoutError(
      `Minimal summa ${CHECKOUT_MIN_SUM} so'm`,
      "AMOUNT_TOO_SMALL"
    );
  }

  if (amountSum > CHECKOUT_MAX_SUM) {
    throw new CheckoutError(
      `Maksimal summa ${CHECKOUT_MAX_SUM} so'm`,
      "AMOUNT_TOO_LARGE"
    );
  }

  const data = await request<CreatePaymentResponse>("/create_payment", {
    amount: amountSum,
    description: params.description.slice(0, 200),
    ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
  });

  const payment = data.payment;

  // Javob shaklini tekshiramiz: shlyuz formatini o'zgartirsa, xato
  // to'lov oqimining o'rtasida emas, shu yerda chiqishi kerak.
  if (
    typeof payment?._id !== "number" ||
    typeof payment?._uuid !== "string" ||
    typeof payment?._url !== "string"
  ) {
    throw new CheckoutError(
      "Shlyuz javobida kutilgan maydonlar yo'q",
      "BAD_RESPONSE",
      data
    );
  }

  return {
    invoiceId: payment._id,
    uuid: payment._uuid,
    paymentUrl: payment._url,
    amountSum: payment._amount,
    payVia: payment._pay_via ?? {},
    expiresInSeconds: payment._lifteme?._second ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Holatni tekshirish
// ─────────────────────────────────────────────────────────────────────────────

type StatusResponse = {
  status: string;
  data: {
    id: number;
    amount: number;
    status: string;
    created_at: string;
    paid_at: string | null;
  };
};

export type CheckoutPaymentStatus = {
  invoiceId: number;
  /** So'mdagi summa */
  amountSum: number;
  /** Shlyuzdagi holat: pending | paid | ... */
  status: string;
  isPaid: boolean;
  paidAt: Date | null;
};

/**
 * To'lov holatini shlyuzdan SO'RAB oladi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BU FUNKSIYA XAVFSIZLIK UCHUN HAL QILUVCHI
 *
 *  CHECKOUT.UZ webhook'ida IMZO YO'Q (hujjatda signature/HMAC
 *  ko'rsatilmagan). Ya'ni webhook manzilini bilgan istalgan odam
 *  "to'lov tasdiqlandi" degan so'rov yuborishi mumkin.
 *
 *  Shuning uchun webhook FAQAT SIGNAL sifatida qabul qilinadi: uning
 *  tanasidagi summa va holatga ISHONILMAYDI. Pul qo'shishdan oldin
 *  shlyuzning o'zidan shu funksiya orqali tasdiq olinadi.
 *
 *  Shu sababli bu funksiyani "optimizatsiya uchun" o'tkazib yuborish
 *  MUMKIN EMAS — u himoyaning o'zi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function getCheckoutPaymentStatus(
  invoiceId: number
): Promise<CheckoutPaymentStatus> {
  const data = await request<StatusResponse>("/status_payment", {
    id: invoiceId,
  });

  const payment = data.data;

  if (typeof payment?.id !== "number" || typeof payment?.status !== "string") {
    throw new CheckoutError(
      "Holat javobida kutilgan maydonlar yo'q",
      "BAD_RESPONSE",
      data
    );
  }

  const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;

  return {
    invoiceId: payment.id,
    amountSum: payment.amount,
    status: payment.status,
    isPaid: payment.status.toLowerCase() === "paid",
    paidAt: paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kassa ma'lumotlari (admin paneli uchun)
// ─────────────────────────────────────────────────────────────────────────────

type BalanceResponse = {
  status: string;
  balance: Record<string, number>;
};

/**
 * Kassa balansi.
 *
 * DIQQAT: bu SHLYUZDAGI balans — platformaning ichki hamyon hisobi
 * emas. Ikkisi boshqa narsa: shlyuzdagi pul hali bankka o'tkazilmagan
 * tushum, ichki hamyon esa foydalanuvchilarga tegishli mablag'.
 */
export async function getCheckoutBalance(): Promise<Record<string, number>> {
  const data = await request<BalanceResponse>("/get_balance");
  return data.balance ?? {};
}

type StatsResponse = {
  status: string;
  stats: { total_orders: number; total_amount: number };
};

export async function getCheckoutStats(): Promise<{
  totalOrders: number;
  totalAmount: number;
}> {
  const data = await request<StatsResponse>("/get_stats");

  return {
    totalOrders: data.stats?.total_orders ?? 0,
    totalAmount: data.stats?.total_amount ?? 0,
  };
}

/** Foydalanuvchiga ko'rsatiladigan xato xabari. */
export function checkoutErrorMessage(error: unknown): string {
  if (error instanceof CheckoutError) {
    switch (error.code) {
      case "NOT_CONFIGURED":
        return "To'lov tizimi hali sozlanmagan. Yordam xizmatiga murojaat qiling.";
      case "AMOUNT_TOO_SMALL":
        return `Minimal to'lov summasi ${CHECKOUT_MIN_SUM.toLocaleString("ru-RU")} so'm.`;
      case "AMOUNT_TOO_LARGE":
        return `Maksimal to'lov summasi ${CHECKOUT_MAX_SUM.toLocaleString("ru-RU")} so'm.`;
      case "FRACTIONAL_AMOUNT":
        return "Summani butun so'mda kiriting.";
      case "NETWORK":
        return "To'lov tizimiga ulanib bo'lmadi. Bir daqiqadan keyin qayta urinib ko'ring.";
      case "UNAUTHORIZED":
        /**
         * Bu MIJOZNING xatosi emas — kassa kaliti noto'g'ri.
         *
         * Mijozga "qayta urinib ko'ring" deyish yolg'on bo'lardi: u
         * necha marta urinsa ham ishlamaydi. Shu sababli boshqa
         * yo'lga (bank o'tkazmasi) yo'naltiramiz.
         */
        return (
          "To'lov tizimi vaqtincha ishlamayapti. " +
          "Bank o'tkazmasi orqali to'ldirishingiz mumkin."
        );
      default:
        return "To'lov amalga oshmadi. Qayta urinib ko'ring.";
    }
  }

  return "Kutilmagan xatolik. Qayta urinib ko'ring.";
}
