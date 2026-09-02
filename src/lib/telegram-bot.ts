// Mijozlar Telegram boti + Mini App yordamchi kutubxonasi.
// Egasi BotFather'dan token beradi → OzodFlow webhook, buyruqlar va "Menyu"
// tugmasini (Mini App) avtomatik sozlaydi. Bot mijoz bilan gaplashadi va
// buyurtma holati o'zgarganda unga push xabar yozadi.
//
// MUHIM: hech bir funksiya throw qilmaydi — bot muammosi asosiy oqimni buzmasin.

import crypto from "crypto";
import { BASE_DOMAIN } from "./urls";

const API = "https://api.telegram.org/bot";

type TgResult<T> = { ok: boolean; result?: T; description?: string };

async function call<T = unknown>(
  token: string,
  method: string,
  body?: unknown
): Promise<TgResult<T>> {
  try {
    const res = await fetch(`${API}${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as TgResult<T> | null;
    return json ?? { ok: false, description: "Javob o'qilmadi" };
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : "Tarmoq xatosi" };
  }
}

export type BotInfo = { id: number; username: string; first_name: string };

// Token haqiqiyligini tekshiradi va bot ma'lumotini qaytaradi (yoki null).
export async function getBotInfo(token: string): Promise<BotInfo | null> {
  const r = await call<BotInfo>(token, "getMe");
  if (!r.ok || !r.result?.username) return null;
  return r.result;
}

// Mini App (menyu) to'liq https manzili. Path ko'rinishi doim ishlaydi
// (subdomen wildcard shart emas). tg=1 — menyu Telegram ichida ekanini biladi.
export function miniAppUrl(slug: string): string {
  return `https://${BASE_DOMAIN}/m/${slug}?tg=1`;
}

// Webhook manzili (sir bilan). Telegram shu manzilga update yuboradi.
export function webhookUrl(secret: string): string {
  return `https://${BASE_DOMAIN}/api/tg/${secret}`;
}

// Tasodifiy webhook siri (URL yo'lida).
export function makeBotSecret(): string {
  return crypto.randomBytes(18).toString("hex");
}

// Botni to'liq sozlaydi: webhook + buyruqlar + "Menyu" tugmasi (Mini App) +
// tavsif. Muvaffaqiyat bo'lsa true.
export async function configureBot(opts: {
  token: string;
  slug: string;
  secret: string;
  restaurantName: string;
}): Promise<boolean> {
  const { token, slug, secret, restaurantName } = opts;
  const menu = miniAppUrl(slug);

  // 1) Webhook — eski so'rovlarni tushirib, faqat message/callback qabul qilamiz
  const wh = await call(token, "setWebhook", {
    url: webhookUrl(secret),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  if (!wh.ok) return false;

  // 2) Buyruqlar menyusi (chapdagi "/" tugma)
  await call(token, "setMyCommands", {
    commands: [
      { command: "start", description: "Boshlash / menyuni ochish" },
      { command: "menyu", description: "🍽 Menyuni ochish" },
      { command: "buyurtmalarim", description: "📋 Buyurtmalarim" },
      { command: "aloqa", description: "📞 Aloqa" },
    ],
  });

  // 3) Chat menyu tugmasi — pastdagi "Menyu" bosilganda Mini App ochiladi
  await call(token, "setChatMenuButton", {
    menu_button: { type: "web_app", text: "🍽 Menyu", web_app: { url: menu } },
  });

  // 4) Bot tavsifi (birinchi ochilganda ko'rinadi)
  await call(token, "setMyDescription", {
    description: `${restaurantName} — menyuni ko'ring va buyurtma bering. "Menyu" tugmasini bosing 👇`,
  });
  await call(token, "setMyShortDescription", {
    short_description: `${restaurantName} menyusi va buyurtma`,
  });

  return true;
}

// Webhookni o'chiradi (bot uzilganda).
export async function removeWebhook(token: string): Promise<void> {
  await call(token, "deleteWebhook", { drop_pending_updates: false });
}

// Mini App tugmasi bilan xabar yuboradi (menyu ochish).
export async function sendMenuButton(
  token: string,
  chatId: string | number,
  slug: string,
  text: string
): Promise<void> {
  await call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "🍽 Menyuni ochish", web_app: { url: miniAppUrl(slug) } }]],
    },
  });
}

// Oddiy matnli xabar (HTML).
export async function sendBotMessage(
  token: string,
  chatId: string | number,
  text: string
): Promise<void> {
  await call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

// Callback query'ga javob (tugma bosilganda "loading" belgisini o'chiradi).
export async function answerCallback(token: string, id: string, text?: string): Promise<void> {
  await call(token, "answerCallbackQuery", { callback_query_id: id, text });
}

// Buyurtma holati o'zgarganda mijozga (bot orqali) push xabar yuboradi.
// Har holat uchun tabiiy o'zbekcha matn. Hech qachon throw qilmaydi.
const STATUS_MSG: Record<string, string> = {
  ACCEPTED: "✅ Buyurtmangiz <b>qabul qilindi</b>!",
  PREPARING: "👨‍🍳 Buyurtmangiz <b>tayyorlanmoqda</b>.",
  READY: "🎉 Buyurtmangiz <b>tayyor</b>! Tez orada oldingizga keladi.",
  DELIVERED: "🚚 Buyurtmangiz <b>yetkazildi</b>. Yoqimli ishtaha! 😋",
  CANCELLED: "❌ Afsuski, buyurtmangiz <b>bekor qilindi</b>.",
};

export async function sendOrderStatusToCustomer(opts: {
  token: string;
  chatId: string;
  orderNumber: number;
  status: string;
}): Promise<void> {
  const line = STATUS_MSG[opts.status];
  if (!line) return; // NEW yoki noma'lum holat — xabar bermaymiz
  await sendBotMessage(opts.token, opts.chatId, `${line}\n\nBuyurtma #${opts.orderNumber}`);
}

// ─── Mini App initData tekshiruvi (HMAC-SHA256) ───
// Telegram Mini App'dan kelgan foydalanuvchi ma'lumoti soxta emasligini bot
// tokeni bilan tasdiqlaydi. Yaroqli bo'lsa — user obyektini qaytaradi.
export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

export function verifyInitData(initData: string, token: string): TgUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheck = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
    const computed = crypto.createHmac("sha256", secretKey).update(dataCheck).digest("hex");
    if (computed !== hash) return null;

    // auth_date juda eski bo'lsa rad etamiz (24 soat)
    const authDate = Number(params.get("auth_date") || 0);
    if (authDate && Date.now() / 1000 - authDate > 86400) return null;

    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as TgUser;
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}
