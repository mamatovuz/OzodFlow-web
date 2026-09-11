import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";
import { ORDER_STATUSES, type OrderItem } from "@/lib/orders";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendOrderStatusToCustomer } from "@/lib/telegram-bot";
import { parseJson } from "@/lib/utils";

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

  // ─── Oshxona: bitta taomni "tayyor" deb belgilash (item-level) ───
  // Body: { itemIndex: number, done: boolean }
  // Hamma taom "tayyor" bo'lsa — buyurtma avtomatik READY holatiga o'tadi.
  if (body && typeof body.itemIndex === "number") {
    const items = parseJson<OrderItem[]>(order.items, []);
    if (body.itemIndex < 0 || body.itemIndex >= items.length)
      return fail("Taom topilmadi", 404);
    items[body.itemIndex] = { ...items[body.itemIndex], done: body.done !== false };
    const allDone = items.length > 0 && items.every((it) => it.done);
    const moveToReady = allDone && ["NEW", "ACCEPTED", "PREPARING"].includes(order.status);
    const updated = await prisma.order.update({
      where: { id },
      data: {
        items: JSON.stringify(items),
        ...(moveToReady
          ? { status: "READY", readyAt: order.readyAt ?? new Date() }
          : {}),
      },
    });
    return ok({ id: updated.id, status: updated.status, allDone });
  }

  const status = body?.status;
  if (!VALID.includes(status)) return fail("Noto'g'ri holat", 422);
  // Bekor qilishda sabab (masalan "Osh tugadi") — ofitsant ko'radi
  const cancelReason =
    status === "CANCELLED" && typeof body?.cancelReason === "string"
      ? body.cancelReason.slice(0, 200)
      : undefined;

  // READY holatiga birinchi marta o'tganda tayyorlash vaqtini yozamiz (statistika uchun).
  // Orqaga qaytarilsa (recall: READY→PREPARING) readyAt tozalanadi.
  const readyPatch =
    status === "READY" && !order.readyAt
      ? { readyAt: new Date() }
      : status === "PREPARING" || status === "NEW" || status === "ACCEPTED"
      ? { readyAt: null }
      : {};

  const updated = await prisma.order.update({
    where: { id },
    data: { status, ...(cancelReason !== undefined ? { cancelReason } : {}), ...readyPatch },
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
