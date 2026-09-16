import { prisma } from "./prisma";
import { sendOrderToChannel } from "./order-telegram";
import { sendBotMessage } from "./telegram-bot";
import { dispatchWebhook } from "./webhooks";
import { pushOrderToPos } from "./pos";
import { formatPrice } from "./utils";
import type { OrderItem } from "./orders";

// To'lovi tasdiqlangan buyurtmani "e'lon qiladi": Telegram kanaliga yuboradi,
// mijozga xabar beradi, webhook va POS ga uzatadi. Odatiy buyurtma yaratishdagi
// side-effektlar bilan bir xil (faqat tasdiqdan keyin ishlaydi).
export async function publishConfirmedOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
  if (!restaurant) return;

  let items: OrderItem[] = [];
  try {
    items = JSON.parse(order.items) as OrderItem[];
  } catch {
    items = [];
  }

  // Telegram kanali
  if (restaurant.orderBotToken && restaurant.orderChatId) {
    void sendOrderToChannel({
      token: restaurant.orderBotToken,
      chatId: restaurant.orderChatId,
      restaurantName: restaurant.name,
      currency: restaurant.currency,
      order: {
        number: order.number,
        orderType: order.orderType,
        tableName: order.tableName,
        phone: order.phone,
        comment: order.comment,
        total: order.total,
        address: order.address,
        lat: order.lat,
        lng: order.lng,
        waiterName: order.waiterName,
        waiterCode: order.waiterCode,
      },
      items,
    });
  }

  // Mijozga (Telegram bot orqali) xabar
  if (order.tgChatId && restaurant.botToken) {
    void sendBotMessage(
      restaurant.botToken,
      order.tgChatId,
      `✅ <b>To'lovingiz tasdiqlandi!</b>\n\nBuyurtma #${order.number}\n💰 Jami: ${formatPrice(order.total, restaurant.currency)}\n\nBuyurtmangiz qabul qilindi.`
    );
  }

  // POS
  void pushOrderToPos({
    id: order.id,
    restaurantId: restaurant.id,
    tableCode: order.tableCode,
    phone: order.phone,
    comment: order.comment,
    items: items.map((o) => ({ productId: o.productId, qty: o.qty })),
  });

  // Webhook
  void dispatchWebhook(restaurant.id, "order.created", {
    id: order.id,
    number: order.number,
    total: order.total,
    tableCode: order.tableCode,
    tableName: order.tableName,
    phone: order.phone,
    comment: order.comment,
    orderType: order.orderType,
    address: order.address,
    lat: order.lat,
    lng: order.lng,
    items,
    status: order.status,
  });
}
