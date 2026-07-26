import { env } from "@/lib/env";
import { tiyinToSum, type Tiyin } from "@/lib/money";

/**
 * inPAY — to'lov shlyuzi klienti
 *
 * Hujjat: https://inpay.uz/api/v1
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BIRLIK: inPAY SO'M BILAN ISHLAYDI
 *
 *  Bizning tizimda pul TIYINDA (`bigint`). Shlyuz esa so'm kutadi
 *  (`amount: 15000`). Aylantirish faqat SHU faylda bajariladi — boshqa
 *  joyda tiyin qoladi.
 *
 *  Tiyin qoldig'i bo'lgan summa (masalan 1500,50 so'm) yuborilmaydi:
 *  keyin `/transactions/` qaytargan summa lokal yozuvga hech qachon teng
 *  bo'lmasdi va har to'lov "summa mos kelmadi" bo'lib qolardi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Shlyuz cheklovlari (hujjatdan):
 *    • minimal: 1 000 so'm
 *    • maksimal: kassa tarifiga bog'liq (AMOUNT_TOO_HIGH xatosi bilan
 *      qaytariladi — biz oldindan bilmaymiz)
 *    • RATE LIMIT: har IP uchun soatiga 100 so'rov
 *
 *  Oxirgi cheklov arxitekturaga ta'sir qiladi — pastdagi token keshiga
 *  qarang.
 */

const API_BASE = "https://inpay.uz/api/v1";

/** Shlyuz cheklovi — so'mda. */
export const INPAY_MIN_SUM = 1_000;

/**
 * Yuqori chegara.
 *
 * inPAY hujjatida aniq son yo'q — u kassa tarifiga bog'liq va
 * `AMOUNT_TOO_HIGH` xatosi bilan qaytariladi. Shu sababli bu qiymat
 * BIZNING himoyamiz: bundan katta summa shlyuzga umuman yuborilmaydi va
 * mijoz "AMOUNT_TOO_HIGH" degan tushunarsiz xato o'rniga bank
 * o'tkazmasiga yo'naltiriladi.
 */
export const INPAY_MAX_SUM = 100_000_000;

/**
 * So'rov kutish muddati.
 *
 * Cheklovsiz `fetch` osilib qolsa, foydalanuvchi cheksiz kutadi va
 * server ulanishlari to'planib ketadi.
 */
const REQUEST_TIMEOUT_MS = 15_000;

export class InpayError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_CONFIGURED"
      | "AMOUNT_TOO_SMALL"
      | "AMOUNT_TOO_LARGE"
      | "FRACTIONAL_AMOUNT"
      | "NETWORK"
      /** Merchant kaliti noto'g'ri (HTTP 401/403) */
      | "UNAUTHORIZED"
      /** Soatiga 100 so'rov limiti oshdi (HTTP 429) */
      | "RATE_LIMITED"
      /** Callback domeni whitelist'da yo'q */
      | "CALLBACK_NOT_WHITELISTED"
      | "API_ERROR"
      | "BAD_RESPONSE",
    /** Shlyuzdan kelgan xom javob — log uchun */
    readonly details?: unknown
  ) {
    super(message);
    this.name = "InpayError";
  }
}

/** Shlyuz sozlanganmi. Sozlanmagan bo'lsa qo'lda to'ldirishga o'tiladi. */
export function isInpayConfigured(): boolean {
  return (
    env.INPAY_MERCHANT_ID !== undefined && Boolean(env.INPAY_MERCHANT_TOKEN)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bearer token keshi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA TOKEN KESHLANADI — bu ixtiyoriy optimizatsiya EMAS
 *
 *  inPAY'da har IP uchun SOATIGA 100 SO'ROV limiti bor. Agar har to'lov
 *  uchun avval token olsak, keyin to'lov yaratsak — bitta to'lov 2
 *  so'rov yeydi va soatiga faqat 50 to'lov qabul qilardik. Holat
 *  tekshiruvini ham qo'shsak — 33.
 *
 *  Token 24 soat amal qiladi, ya'ni uni bir marta olib qayta ishlatish
 *  hujjatda ham tavsiya etilgan.
 *
 *  KESH JOYI: modul o'zgaruvchisi. Redis emas — sababi:
 *    • bitta instansiyada bu yetarli
 *    • token maxfiy: uni tashqi keshga yozish yana bitta sirqish yo'li
 *    • instansiya qayta ishga tushsa token qaytadan olinadi (1 so'rov)
 *
 *  Ko'p instansiyada har biri o'z tokenini oladi — bu muammo emas,
 *  chunki tokenlar bir-birini bekor qilmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
type CachedToken = {
  token: string;
  /** Muddati tugaydigan vaqt (ms) */
  expiresAt: number;
};

let tokenCache: CachedToken | null = null;

/**
 * Tokenni muddatidan OLDIN yangilaymiz.
 *
 * 24 soat emas, 23 soat: so'rov aynan muddat tugash chegarasiga tushib
 * qolsa 401 olardik. Bir soatlik zaxira bu poygani butunlay yopadi.
 */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

/**
 * Bir vaqtda ketayotgan token so'rovi.
 *
 * NEGA KERAK: server ishga tushgan zahoti bir necha to'lov kelsa,
 * har biri "kesh bo'sh" deb ko'rib alohida token so'rardi — limitni
 * bekorga yeyish. Ketayotgan so'rovni kutish esa bittasi bilan
 * chegaralaydi.
 */
let tokenInFlight: Promise<string> | null = null;

type AuthResponse = {
  success?: boolean;
  bearer_token?: string;
  message?: string;
  error_code?: string;
};

/** Yangi bearer token oladi (keshni e'tiborga olmaydi). */
async function fetchToken(): Promise<string> {
  const merchantId = env.INPAY_MERCHANT_ID;
  const merchantToken = env.INPAY_MERCHANT_TOKEN;

  if (merchantId === undefined || !merchantToken) {
    throw new InpayError("inPAY sozlanmagan", "NOT_CONFIGURED");
  }

  // DIQQAT: maxfiy kalitlar QUERY'da yuboriladi — hujjat shunday talab
  // qiladi. Shu sababli bu manzil HECH QACHON log'ga yozilmaydi;
  // pastdagi xato log'larida faqat `status` va `error_code` bor.
  const url = new URL(`${API_BASE}/authorization/`);
  url.searchParams.set("merchant_id", String(merchantId));
  url.searchParams.set("merchant_token", merchantToken);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new InpayError(
      "Shlyuzga ulanib bo'lmadi (autentifikatsiya)",
      "NETWORK",
      error
    );
  }

  const text = await response.text();

  let parsed: AuthResponse;
  try {
    parsed = JSON.parse(text) as AuthResponse;
  } catch {
    throw new InpayError(
      `Shlyuz JSON bo'lmagan javob qaytardi (${response.status})`,
      "BAD_RESPONSE",
      text.slice(0, 500)
    );
  }

  if (!response.ok || parsed.success !== true || !parsed.bearer_token) {
    // Merchant ma'lumoti noto'g'ri bo'lsa qayta urinishning ma'nosi yo'q.
    const isAuth =
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404;

    console.error(
      `[inpay] Token olinmadi (${response.status}): ` +
        `${parsed.error_code ?? "?"} — ${parsed.message ?? "sabab yo'q"}`
    );

    throw new InpayError(
      isAuth
        ? "Merchant ma'lumotlari rad etildi"
        : `Token olinmadi (${response.status})`,
      isAuth ? "UNAUTHORIZED" : "API_ERROR",
      parsed
    );
  }

  return parsed.bearer_token;
}

/** Keshdan token oladi, kerak bo'lsa yangilaydi. */
async function getToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  // Boshqa so'rov allaqachon token olayotgan bo'lsa — uni kutamiz.
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = fetchToken()
    .then((token) => {
      tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
      return token;
    })
    .finally(() => {
      tokenInFlight = null;
    });

  return tokenInFlight;
}

/** Keshni tozalaydi — 401 kelganda chaqiriladi. */
function invalidateToken(): void {
  tokenCache = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// So'rov yuborish
// ─────────────────────────────────────────────────────────────────────────────

type ApiError = {
  success?: boolean;
  message?: string;
  error_code?: string;
  details?: unknown;
};

/**
 * Xato kodini bizning kodimizga aylantiradi.
 *
 * inPAY `error_code` qaytaradi — undan foydalanish HTTP kodiga
 * qaraganda aniqroq.
 */
function mapErrorCode(
  status: number,
  errorCode: string | undefined
): InpayError["code"] {
  switch (errorCode) {
    case "MISSING_AUTH_TOKEN":
    case "INVALID_TOKEN":
    case "MISSING_MERCHANT_ID":
    case "MERCHANT_NOT_FOUND":
    case "IP_NOT_WHITELISTED_STRICT":
      return "UNAUTHORIZED";
    case "RATE_LIMIT_EXCEEDED":
      return "RATE_LIMITED";
    case "CALLBACK_NOT_WHITELISTED":
    case "MERCHANT_WEBSITE_NOT_WHITELISTED":
      return "CALLBACK_NOT_WHITELISTED";
    case "AMOUNT_TOO_LOW":
      return "AMOUNT_TOO_SMALL";
    case "AMOUNT_TOO_HIGH":
      return "AMOUNT_TOO_LARGE";
  }

  // Kod berilmagan bo'lsa HTTP holatiga qaraymiz.
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 429) return "RATE_LIMITED";

  return "API_ERROR";
}

/**
 * Bearer bilan so'rov yuboradi.
 *
 * 401 kelsa token keshi tozalanadi va so'rov BIR MARTA takrorlanadi:
 * token muddati kutilmaganda tugagan bo'lishi mumkin (masalan kassa
 * sozlamalari o'zgargan). Cheksiz takrorlash yo'q — aks holda kalit
 * butunlay noto'g'ri bo'lsa cheksiz aylanardik.
 */
async function request<T>(
  endpoint: string,
  options: { method: "GET" | "POST"; body?: Record<string, unknown> },
  isRetry = false
): Promise<T> {
  const token = await getToken();

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // To'lov so'rovi hech qachon keshlanmaydi.
      cache: "no-store",
    });
  } catch (error) {
    throw new InpayError(
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
    throw new InpayError(
      `Shlyuz JSON bo'lmagan javob qaytardi (${response.status})`,
      "BAD_RESPONSE",
      text.slice(0, 500)
    );
  }

  const asError = parsed as ApiError;

  // Shlyuz HTTP 200 bilan ham `success: false` qaytarishi mumkin —
  // faqat status kodiga ishonmaymiz.
  if (!response.ok || asError.success !== true) {
    const code = mapErrorCode(response.status, asError.error_code);

    // Token eskirgan bo'lsa bir marta qayta urinamiz.
    if (code === "UNAUTHORIZED" && !isRetry) {
      invalidateToken();
      return request<T>(endpoint, options, true);
    }

    console.error(
      `[inpay] ${endpoint} xato qaytardi (${response.status}): ` +
        `${asError.error_code ?? "?"} — ${asError.message ?? "sabab yo'q"}`
    );

    throw new InpayError(
      asError.message ?? `Shlyuz xato qaytardi (${response.status})`,
      code,
      parsed
    );
  }

  return parsed as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// To'lov yaratish
// ─────────────────────────────────────────────────────────────────────────────

type CreateResponse = {
  success: boolean;
  order_id?: string;
  pay_url?: string;
  pay_url_link?: string;
  pay_links?: Record<string, string>;
  message?: string;
};

/** To'lov usuli — inPAY qabul qiladigan qiymatlar. */
export const INPAY_METHODS = ["click", "payme", "plum", "inPAY"] as const;
export type InpayMethod = (typeof INPAY_METHODS)[number];

export type InpayInvoice = {
  /** Shlyuzdagi buyurtma id — lokal yozuvni topish kaliti */
  orderId: string;
  /** Mijoz yo'naltiriladigan to'lov sahifasi */
  payUrl: string;
  /**
   * To'lov tizimlarining TO'G'RIDAN havolalari (click, payme…).
   *
   * Bo'lsa mijozga usul tanlatib, uni inPAY sahifasini chetlab
   * bevosita to'lovga yuborish mumkin — bir qadam kam.
   */
  payLinks: Record<string, string>;
  amountSum: number;
};

export async function createInpayPayment(params: {
  amount: Tiyin;
  description: string;
  /** Webhook manzili. Domen inPAY whitelist'ida bo'lishi kerak. */
  callbackUrl: string;
  /** Tanlangan usul. Berilmasa inPAY o'z sahifasida tanlatadi. */
  method?: InpayMethod;
  /** Mijozning haqiqiy IP — server orqali ulanishda tavsiya etiladi. */
  clientIp?: string | null;
  phone?: string | null;
}): Promise<InpayInvoice> {
  if (!isInpayConfigured()) {
    throw new InpayError("inPAY sozlanmagan", "NOT_CONFIGURED");
  }

  /**
   * Tiyin qoldig'i BO'LMASLIGI kerak.
   *
   * Shlyuz so'm bilan ishlaydi. 1500,50 so'mni yuborsak u 1500 yoki
   * 1501 bo'lib qaytardi va summa tekshiruvi har doim yiqilardi —
   * ya'ni mijoz to'lagan puli hamyonga tushmasdi.
   */
  if (params.amount % 100n !== 0n) {
    throw new InpayError(
      "Summada tiyin qoldig'i bor — shlyuz butun so'm qabul qiladi",
      "FRACTIONAL_AMOUNT"
    );
  }

  const amountSum = tiyinToSum(params.amount);

  if (amountSum < INPAY_MIN_SUM) {
    throw new InpayError(
      `Minimal summa ${INPAY_MIN_SUM} so'm`,
      "AMOUNT_TOO_SMALL"
    );
  }

  if (amountSum > INPAY_MAX_SUM) {
    throw new InpayError(
      `Maksimal summa ${INPAY_MAX_SUM} so'm`,
      "AMOUNT_TOO_LARGE"
    );
  }

  const data = await request<CreateResponse>("/create/", {
    method: "POST",
    body: {
      // Hujjat bo'yicha tanada ham merchant ma'lumoti kerak —
      // Bearer token yetarli emas.
      merchant_id: env.INPAY_MERCHANT_ID,
      token: env.INPAY_MERCHANT_TOKEN,
      amount: amountSum,
      description: params.description,
      callback_url: params.callbackUrl,
      ...(params.method ? { payment_method: params.method } : {}),
      ...(params.clientIp ? { client_ip: params.clientIp } : {}),
      ...(params.phone ? { phone: params.phone } : {}),
    },
  });

  // Javob shaklini TEKSHIRAMIZ: `success: true` bo'lsa ham kerakli
  // maydon yo'q bo'lishi mumkin. Bo'sh `payUrl` bilan mijozni
  // yo'naltirsak u bo'sh sahifaga tushardi.
  if (!data.order_id || !data.pay_url) {
    throw new InpayError(
      "Shlyuz to'lov havolasini qaytarmadi",
      "BAD_RESPONSE",
      data
    );
  }

  return {
    orderId: data.order_id,
    // `pay_url_link` — so'ralgan usulning to'g'ridan havolasi. Bo'lsa
    // undan foydalanamiz: bir qadam kam.
    payUrl: params.method ? (data.pay_url_link ?? data.pay_url) : data.pay_url,
    payLinks: data.pay_links ?? {},
    amountSum,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Holatni tekshirish
// ─────────────────────────────────────────────────────────────────────────────

type TransactionResponse = {
  success: boolean;
  order_id?: string;
  status?: string;
  amount?: number | string;
  payment_method?: string;
  created_at?: string;
  paid_at?: string | null;
};

export type InpayPaymentStatus = {
  orderId: string;
  /** pending | success | failed | cancelled */
  status: string;
  isPaid: boolean;
  amountSum: number;
  method: string | null;
  paidAt: Date | null;
};

/**
 * To'lov holatini SHLYUZNING O'ZIDAN so'raydi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  XAVFSIZLIK: BU FUNKSIYA HAQIQATNING YAGONA MANBASI
 *
 *  Webhook tanasiga ISHONILMAYDI — unda imzo yo'q va manzil ochiq.
 *  Pul faqat shu funksiya "to'langan" degandan keyin qo'shiladi.
 *
 *  Webhook'ni o'zgartirsa ham hujum ishlamaydi: u faqat `order_id`
 *  beradi, qolgan hammasi shu yerdan olinadi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function getInpayPaymentStatus(
  orderId: string
): Promise<InpayPaymentStatus> {
  const data = await request<TransactionResponse>(
    `/transactions/?order_id=${encodeURIComponent(orderId)}`,
    { method: "GET" }
  );

  if (!data.status) {
    throw new InpayError("Shlyuz holatni qaytarmadi", "BAD_RESPONSE", data);
  }

  const status = data.status.toLowerCase();

  /**
   * Summa `number` yoki `"15000.00"` ko'rinishida kelishi mumkin —
   * webhook'da matn, `/transactions/` da son. Ikkalasini ham
   * qabul qilamiz.
   */
  const amountSum = Number(data.amount ?? 0);

  if (!Number.isFinite(amountSum)) {
    throw new InpayError(
      `Shlyuz tushunarsiz summa qaytardi: ${String(data.amount)}`,
      "BAD_RESPONSE",
      data
    );
  }

  return {
    orderId: data.order_id ?? orderId,
    status,
    // FAQAT "success" to'langan hisoblanadi. "pending" yoki boshqa
    // qiymat — pul qo'shilmaydi.
    isPaid: status === "success",
    amountSum,
    method: data.payment_method ?? null,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Xato xabarlari
// ─────────────────────────────────────────────────────────────────────────────

/** Foydalanuvchiga ko'rsatiladigan xato xabari. */
export function inpayErrorMessage(error: unknown): string {
  if (error instanceof InpayError) {
    switch (error.code) {
      case "NOT_CONFIGURED":
        return "To'lov tizimi hali sozlanmagan. Bank o'tkazmasi orqali to'ldirishingiz mumkin.";
      case "AMOUNT_TOO_SMALL":
        return `Minimal to'lov summasi ${INPAY_MIN_SUM.toLocaleString("ru-RU")} so'm.`;
      case "AMOUNT_TOO_LARGE":
        return "Summa juda katta. Bank o'tkazmasi orqali to'ldirishingiz mumkin.";
      case "FRACTIONAL_AMOUNT":
        return "Summani butun so'mda kiriting.";
      case "NETWORK":
        return "To'lov tizimiga ulanib bo'lmadi. Bir daqiqadan keyin qayta urinib ko'ring.";
      case "RATE_LIMITED":
        // Bu bizning umumiy limitimiz — mijoz aybdor emas.
        return "To'lov tizimi hozir band. Bir daqiqadan keyin qayta urinib ko'ring.";
      case "UNAUTHORIZED":
      case "CALLBACK_NOT_WHITELISTED":
        /**
         * Ikkalasi ham SOZLAMA xatosi — mijoz hech narsa qila olmaydi.
         * "Qayta urinib ko'ring" deyish yolg'on bo'lardi.
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

/**
 * Merchant ma'lumotlari va tariflar.
 *
 * Faqat sozlamani tekshirish uchun (`npm run inpay:check`) —
 * to'lov oqimida ishlatilmaydi.
 */
export async function getInpayMerchant(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>("/merchant/", { method: "GET" });
}
