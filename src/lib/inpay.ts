// ─────────────────────────────────────────────
// inPAY (inpay.uz) to'lov shlyuzi bilan integratsiya.
//
// OzodFlow tariflari (Starter/Business) uchun onlayn to'lov: mijoz kartadan
// to'g'ridan-to'g'ri to'laydi, inPAY webhook orqali natijani bizga qaytaradi,
// biz esa tarifni avtomatik faollashtiramiz (chek yuklash shart emas).
//
// Kalitlar .env dan olinadi:
//   INPAY_MERCHANT_ID     — kassa ID (raqam)
//   INPAY_MERCHANT_TOKEN  — kassa maxfiy tokeni (32 belgi)
//   INPAY_WEBHOOK_SALT    — (ixtiyoriy) webhook imzosini tekshirish uchun SALT
//
// MUHIM: hech bir funksiya throw qilmaydi — to'lov muammosi asosiy oqimni
// buzmasligi kerak. Xato bo'lsa { ok:false, error } qaytaradi.
// ─────────────────────────────────────────────

import crypto from "crypto";
import { BASE_DOMAIN } from "./urls";

const BASE_URL = "https://inpay.uz/api/v1";

export function inpayMerchantId(): string {
  return (process.env.INPAY_MERCHANT_ID || "").trim();
}
export function inpayMerchantToken(): string {
  return (process.env.INPAY_MERCHANT_TOKEN || "").trim();
}
export function inpayWebhookSalt(): string {
  return (process.env.INPAY_WEBHOOK_SALT || "").trim();
}

// inPAY sozlanganmi (kalitlar bormi)?
export function inpayConfigured(): boolean {
  return !!inpayMerchantId() && !!inpayMerchantToken();
}

// Webhook (callback) va qaytish (return) manzillari
export function inpayCallbackUrl(): string {
  return `https://${BASE_DOMAIN}/webhook/tolov`;
}
export function inpayReturnUrl(): string {
  return `https://${BASE_DOMAIN}/dashboard/billing?paid=1`;
}

// ─── Bearer token (24 soat amal qiladi — keshda saqlaymiz) ───
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getBearerToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  try {
    const url = `${BASE_URL}/authorization/?merchant_id=${encodeURIComponent(
      inpayMerchantId()
    )}&merchant_token=${encodeURIComponent(inpayMerchantToken())}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; bearer_token?: string }
      | null;
    if (!json?.success || !json.bearer_token) return null;
    // 23 soatga keshlaymiz (24 soatlik tokenni muddati tugashidan oldin yangilaymiz)
    cachedToken = { token: json.bearer_token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
    return json.bearer_token;
  } catch {
    return null;
  }
}

export type CreatePaymentResult =
  | { ok: true; orderId: string; payUrl: string }
  | { ok: false; error: string };

// Yangi to'lov yaratadi. Muvaffaqiyatli bo'lsa mijozni payUrl'ga yo'naltiramiz.
export async function createInpayPayment(opts: {
  amount: number;
  description: string;
  phone?: string | null;
  paymentMethod?: "click" | "payme" | "";
}): Promise<CreatePaymentResult> {
  if (!inpayConfigured()) return { ok: false, error: "inPAY sozlanmagan" };
  if (!opts.amount || opts.amount < 1000) {
    return { ok: false, error: "Minimal to'lov summasi 1000 so'm" };
  }
  const token = await getBearerToken();
  if (!token) return { ok: false, error: "inPAY bilan bog'lanib bo'lmadi" };

  try {
    const res = await fetch(`${BASE_URL}/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        merchant_id: inpayMerchantId(),
        token: inpayMerchantToken(),
        amount: Math.round(opts.amount),
        description: opts.description,
        payment_method: opts.paymentMethod ?? "",
        phone: opts.phone || undefined,
        callback_url: inpayCallbackUrl(),
        return_url: inpayReturnUrl(),
      }),
    });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; order_id?: string; pay_url?: string; message?: string }
      | null;
    if (!json?.success || !json.order_id || !json.pay_url) {
      return { ok: false, error: json?.message || "To'lov yaratilmadi" };
    }
    return { ok: true, orderId: json.order_id, payUrl: json.pay_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Tarmoq xatosi" };
  }
}

export type InpayStatus = "pending" | "success" | "failed" | "cancelled" | "canceled";

// order_id bo'yicha to'lov holatini inPAY'dan tekshiradi (webhookni tasdiqlash uchun).
// Bu endpoint auth talab qilmaydi.
export async function getInpayTransaction(
  orderId: string
): Promise<{ status: InpayStatus; amount: number } | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/transactions/?order_id=${encodeURIComponent(orderId)}`,
      { headers: { Accept: "application/json" } }
    );
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; status?: string; amount?: number }
      | null;
    if (!json?.success || !json.status) return null;
    return { status: json.status as InpayStatus, amount: Number(json.amount) || 0 };
  } catch {
    return null;
  }
}

// Webhook imzosini tekshiradi (SALT sozlangan bo'lsa): sha256(order_id+amount+status+SALT).
// SALT bo'lmasa — imzo tekshiruvi o'tkazib yuboriladi (status API orqali tasdiqlanadi).
export function verifyWebhookSignature(payload: {
  order_id?: string;
  amount?: string | number;
  status?: string;
  signature?: string;
}): boolean {
  const salt = inpayWebhookSalt();
  if (!salt) return true; // SALT yo'q — imzo tekshirilmaydi (status API bilan tasdiqlaymiz)
  if (!payload.signature) return false;
  const base = `${payload.order_id}${payload.amount}${payload.status}${salt}`;
  const expected = crypto.createHash("sha256").update(base).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(String(payload.signature))
    );
  } catch {
    return false;
  }
}
