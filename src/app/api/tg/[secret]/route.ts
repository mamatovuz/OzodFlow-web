import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMenuButton, sendBotMessage, answerCallback } from "@/lib/telegram-bot";
import { statusMeta } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export const runtime = "nodejs";

// Telegram webhook — bot mijoz bilan gaplashadi.
// Manzil: /api/tg/<secret>. Sir bo'yicha restoran topiladi.
// Har doim tez 200 qaytaramiz (Telegram qayta yubormasligi uchun).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  const update = await req.json().catch(() => null);
  if (!secret || !update) return NextResponse.json({ ok: true });

  const restaurant = await prisma.restaurant.findFirst({
    where: { botSecret: secret, botEnabled: true },
    select: { id: true, name: true, slug: true, currency: true, botToken: true, phone: true },
  });
  if (!restaurant?.botToken) return NextResponse.json({ ok: true });
  const token = restaurant.botToken;

  try {
    // ─── Callback tugmalari ───
    if (update.callback_query) {
      await answerCallback(token, update.callback_query.id);
      return NextResponse.json({ ok: true });
    }

    // ─── Xabarlar ───
    const msg = update.message;
    const text: string = (msg?.text || "").trim();
    const chatId = msg?.chat?.id;
    if (!chatId) return NextResponse.json({ ok: true });

    const cmd = text.toLowerCase().split(/\s+/)[0].replace(/@.*/, "");

    if (cmd === "/start" || cmd === "/menyu" || cmd === "/menu") {
      const first = msg?.from?.first_name ? `, ${msg.from.first_name}` : "";
      await sendMenuButton(
        token,
        chatId,
        restaurant.slug,
        `Assalomu alaykum${first}! 👋\n\n<b>${restaurant.name}</b> menyusiga xush kelibsiz.\nMenyuni ko'rish va buyurtma berish uchun quyidagi tugmani bosing 👇`
      );
    } else if (cmd === "/buyurtmalarim") {
      const orders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id, tgChatId: String(chatId) },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { number: true, status: true, total: true, createdAt: true },
      });
      if (orders.length === 0) {
        await sendMenuButton(
          token,
          chatId,
          restaurant.slug,
          "Sizda hali buyurtma yo'q. Menyudan buyurtma bering 👇"
        );
      } else {
        const lines = orders.map((o) => {
          const m = statusMeta(o.status);
          const d = new Date(o.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
          return `#${o.number} · ${d} · ${m.label} · ${formatPrice(o.total, restaurant.currency)}`;
        });
        await sendBotMessage(token, chatId, `<b>Oxirgi buyurtmalaringiz:</b>\n\n${lines.join("\n")}`);
      }
    } else if (cmd === "/aloqa") {
      await sendBotMessage(
        token,
        chatId,
        `<b>${restaurant.name}</b>${restaurant.phone ? `\n📞 ${restaurant.phone}` : ""}`
      );
    } else {
      // Har qanday boshqa xabar → menyu tugmasi
      await sendMenuButton(
        token,
        chatId,
        restaurant.slug,
        "Menyuni ochish uchun tugmani bosing 👇"
      );
    }
  } catch {
    // jim o'tamiz — webhook doim 200 qaytarishi kerak
  }

  return NextResponse.json({ ok: true });
}
