import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { sendTelegramMessage } from "@/lib/telegram";

const TOPICS = ["BLOCK", "PAYMENT", "CONTACT", "GENERAL"];

// Restoran egasining bosh admin bilan yozishmalari
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const messages = await prisma.supportMessage.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(messages);
}

// Egasi xabar yuboradi (blokdan chiqarishni so'rash, to'lov izohi va h.k.)
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const text = String(body?.body || "").trim();
  const topic = TOPICS.includes(body?.topic) ? body.topic : "GENERAL";
  if (!text) return fail("Xabar matni bo'sh", 422);
  if (text.length > 2000) return fail("Xabar juda uzun", 422);

  const msg = await prisma.supportMessage.create({
    data: {
      restaurantId: restaurant.id,
      topic,
      sender: "OWNER",
      body: text,
    },
  });

  const label =
    topic === "BLOCK"
      ? "🔒 Blokdan chiqarish so'rovi"
      : topic === "PAYMENT"
      ? "💳 To'lov bo'yicha izoh"
      : "✉️ Yangi xabar";
  await sendTelegramMessage(
    `${label}\n<b>${restaurant.name}</b> (/m/${restaurant.slug})\n\n${text}`
  ).catch(() => {});

  return ok(msg, 201);
}
