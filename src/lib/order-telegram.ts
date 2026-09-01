import { formatPrice } from "./utils";
import type { OrderItem } from "./orders";

// HTML maxsus belgilarини xavfsizlaydi (Telegram parse_mode=HTML)
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function tgCall(token: string, method: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return !!json?.ok;
  } catch {
    return false;
  }
}

export type OrderForChannel = {
  number: number;
  orderType: string; // DINE_IN | DELIVERY
  tableName: string | null;
  phone: string | null;
  comment: string | null;
  total: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  waiterName: string | null;
  waiterCode: string | null;
};

// Buyurtmani restoranning Telegram kanaliga chiroyli ko'rinishda yuboradi.
// Hech qachon throw qilmaydi (mijoz buyurtmasi buzilmasin).
export async function sendOrderToChannel(opts: {
  token: string;
  chatId: string;
  restaurantName: string;
  currency: string;
  order: OrderForChannel;
  items: OrderItem[];
}): Promise<boolean> {
  const { token, chatId, restaurantName, currency, order, items } = opts;
  if (!token || !chatId) return false;

  const isDelivery = order.orderType === "DELIVERY";
  const lines: string[] = [];

  lines.push(`🆕 <b>Yangi buyurtma #${order.number}</b>`);
  lines.push(`🏠 ${esc(restaurantName)}`);
  lines.push("");

  if (isDelivery) {
    lines.push("🚚 <b>Yetkazib berish</b>");
    if (order.address) lines.push(`📍 ${esc(order.address)}`);
  } else if (order.tableName) {
    lines.push(`🍽 <b>${esc(order.tableName)}</b>`);
  }
  if (order.waiterName) {
    lines.push(`👤 Ofitsant: ${esc(order.waiterName)}${order.waiterCode ? ` (kod: ${esc(order.waiterCode)})` : ""}`);
  }
  if (order.phone) lines.push(`📞 ${esc(order.phone)}`);
  if (order.comment) lines.push(`📝 ${esc(order.comment)}`);

  lines.push("");
  lines.push("<b>Buyurtma:</b>");
  for (const it of items) {
    lines.push(`• ${it.qty}× ${esc(it.name)} — ${formatPrice(it.price * it.qty, currency)}`);
  }
  lines.push("");
  lines.push(`💰 <b>Jami: ${formatPrice(order.total, currency)}</b>`);

  if (isDelivery && order.lat != null && order.lng != null) {
    lines.push(`🗺 <a href="https://maps.google.com/?q=${order.lat},${order.lng}">Xaritada ko'rish</a>`);
  }

  const ok = await tgCall(token, "sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  // Yetkazib berish bo'lsa — joylashuvni alohida "location" sifatida ham yuboramiz
  if (isDelivery && order.lat != null && order.lng != null) {
    await tgCall(token, "sendLocation", {
      chat_id: chatId,
      latitude: order.lat,
      longitude: order.lng,
    });
  }

  return ok;
}

// Mijoz izohini (otziv) Telegram kanaliga yuboradi. Hech qachon throw qilmaydi.
export async function sendReviewToChannel(opts: {
  token: string;
  chatId: string;
  restaurantName: string;
  rating: number;
  name?: string | null;
  phone?: string | null;
  text?: string | null;
}): Promise<boolean> {
  const { token, chatId, restaurantName, rating, name, phone, text } = opts;
  if (!token || !chatId) return false;
  const stars = "⭐️".repeat(Math.max(1, Math.min(5, rating)));
  const lines: string[] = [];
  lines.push(`💬 <b>Yangi izoh</b> — ${esc(restaurantName)}`);
  lines.push(`${stars} (${rating}/5)`);
  if (name) lines.push(`👤 ${esc(name)}`);
  if (phone) lines.push(`📞 ${esc(phone)}`);
  if (text) {
    lines.push("");
    lines.push(esc(text));
  }
  return tgCall(token, "sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

// Ulanishni tekshirish uchun test xabari
export async function sendTestMessage(token: string, chatId: string, restaurantName: string): Promise<boolean> {
  return tgCall(token, "sendMessage", {
    chat_id: chatId,
    text: `✅ <b>OzodFlow ulandi!</b>\n\n${esc(restaurantName)} buyurtmalari shu yerga tushadi.`,
    parse_mode: "HTML",
  });
}
