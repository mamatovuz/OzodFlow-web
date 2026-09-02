import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";
import { ORDER_STATUSES } from "@/lib/orders";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendOrderStatusToCustomer } from "@/lib/telegram-bot";

const VALID = ORDER_STATUSES.map((s) => s.key);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail("Buyurtma topilmadi", 404);
  const r = await guardRestaurant(user.id, order.restaurantId);
  if (!r) return fail("Buyurtma topilmadi", 404);

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!VALID.includes(status)) return fail("Noto'g'ri holat", 422);

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
  });

  // Buyurtma Telegram Mini App orqali kelgan bo'lsa — mijozga holatni push qilamiz
  if (updated.tgChatId && status !== order.status) {
    const bot = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { botToken: true, botEnabled: true },
    });
    if (bot?.botEnabled && bot.botToken) {
      void sendOrderStatusToCustomer({
        token: bot.botToken,
        chatId: updated.tgChatId,
        orderNumber: updated.number,
        status,
      });
    }
  }

  // Holat o'zgarishini webhooklarga xabar qilamiz (fon rejimda)
  void dispatchWebhook(order.restaurantId, "order.status", {
    id: updated.id,
    number: updated.number,
    status: updated.status,
    total: updated.total,
  });

  return ok(updated);
}
