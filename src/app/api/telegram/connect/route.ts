import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { sendTestMessage } from "@/lib/order-telegram";

const schema = z.object({
  token: z.string().min(20, "Token noto'g'ri"),
  chatId: z.string().min(2, "Kanal ID noto'g'ri"),
});

// Buyurtma kanalini ulash: test xabari yuboriladi, muvaffaqiyatli bo'lsa saqlanadi
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Token va kanal ID ni to'g'ri kiriting", 422);
  }
  const token = parsed.data.token.trim();
  const chatId = parsed.data.chatId.trim();

  const sent = await sendTestMessage(token, chatId, restaurant.name);
  if (!sent) {
    return fail(
      "Ulanmadi. Bot tokeni to'g'ri ekanini va bot kanalga admin sifatida qo'shilganini tekshiring.",
      400
    );
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { orderBotToken: token, orderChatId: chatId },
  });
  return ok({ connected: true });
}

// Uzish
export async function DELETE() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { orderBotToken: null, orderChatId: null },
  });
  return ok({ connected: false });
}
