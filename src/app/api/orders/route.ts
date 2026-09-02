import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { pushOrderToPos } from "@/lib/pos";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendOrderToChannel } from "@/lib/order-telegram";
import { verifyInitData, sendBotMessage } from "@/lib/telegram-bot";
import { idempotentGet, idempotentSet } from "@/lib/idempotency";
import { formatPrice } from "@/lib/utils";
import type { OrderItem } from "@/lib/orders";

// ─── Ommaviy: buyurtma yaratish ───
const createSchema = z.object({
  slug: z.string().min(1),
  tableCode: z.string().optional().nullable(),
  phone: z.string().optional(),
  comment: z.string().optional(),
  orderType: z.enum(["DINE_IN", "DELIVERY"]).optional(),
  address: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  waiterCode: z.string().max(24).optional().nullable(),
  // Telegram Mini App orqali kelgan buyurtma — mijozni aniqlash uchun initData
  tgInitData: z.string().max(4096).optional().nullable(),
  items: z
    .array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(99) }))
    .min(1, "Savat bo'sh"),
});

export async function POST(req: NextRequest) {
  // Spam himoyasi: IP bo'yicha daqiqasiga 15 buyurtma
  const limited = limitOrReject(req, "order", { limit: 15, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }
  const { slug, tableCode, phone, comment, items, orderType, address, lat, lng, waiterCode, tgInitData } = parsed.data;
  const isDelivery = orderType === "DELIVERY";

  // ─── Idempotency: takroriy yuborishda dublikat buyurtma yaratmaymiz ───
  // Mijoz tugmani ikki marta bossa yoki tarmoq sekin bo'lsa himoya qiladi.
  const idemKey = req.headers.get("idempotency-key");
  if (idemKey) {
    const cached = idempotentGet(`order:${slug}:${idemKey}`);
    if (cached) return ok(cached, 200);
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !restaurant.isActive) return fail("Restoran topilmadi", 404);

  // Mahsulotlarni bazadan tekshirish (narxni mijozga ishonmaymiz)
  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id, isAvailable: true },
  });

  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) continue;
    orderItems.push({ productId: p.id, name: p.name, price: p.price, qty: it.qty });
    total += p.price * it.qty;
  }
  if (orderItems.length === 0) return fail("Mahsulotlar mavjud emas", 422);

  // Stol nomi
  let tableName: string | null = null;
  if (tableCode) {
    const t = await prisma.restaurantTable.findFirst({
      where: { code: tableCode, restaurantId: restaurant.id },
    });
    tableName = t?.name ?? null;
  }

  // ─── Ofitsant kodi (funksiya yoqilgan bo'lsa) ───
  let waiterId: string | null = null;
  let waiterCodeStored: string | null = null;
  let waiterName: string | null = null;
  if (restaurant.waiterCodeEnabled) {
    const code = (waiterCode || "").trim();
    if (code) {
      const w = await prisma.waiter.findFirst({
        where: { restaurantId: restaurant.id, code, isActive: true },
        select: { id: true, code: true, name: true, lastName: true },
      });
      if (!w) return fail("Ofitsant kodi noto'g'ri", 422);
      waiterId = w.id;
      waiterCodeStored = w.code;
      waiterName = `${w.name}${w.lastName ? " " + w.lastName : ""}`;
    }
  }

  // ─── Telegram Mini App mijozi (initData tasdiqlansa) ───
  let tgChatId: string | null = null;
  let tgUser: { id: number; first_name?: string; username?: string } | null = null;
  if (tgInitData && restaurant.botToken) {
    const u = verifyInitData(tgInitData, restaurant.botToken);
    if (u) {
      tgUser = u;
      tgChatId = String(u.id);
    }
  }

  // Ketma-ket raqam
  const last = await prisma.order.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  const order = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      number,
      tableCode: tableCode || null,
      tableName,
      phone: phone || null,
      comment: comment || null,
      orderType: isDelivery ? "DELIVERY" : "DINE_IN",
      address: isDelivery ? address || null : null,
      lat: isDelivery ? lat ?? null : null,
      lng: isDelivery ? lng ?? null : null,
      status: "NEW",
      total,
      items: JSON.stringify(orderItems),
      waiterId,
      waiterCode: waiterCodeStored,
      tgChatId,
    },
  });

  // ─── Telegram mijozini saqlab, unga tasdiq xabarini yuboramiz ───
  if (tgUser && tgChatId && restaurant.botToken) {
    void prisma.botCustomer
      .upsert({
        where: { restaurantId_tgUserId: { restaurantId: restaurant.id, tgUserId: tgChatId } },
        create: {
          restaurantId: restaurant.id,
          tgUserId: tgChatId,
          firstName: tgUser.first_name || null,
          username: tgUser.username || null,
          phone: phone || null,
          orders: 1,
          lastOrderAt: new Date(),
        },
        update: {
          orders: { increment: 1 },
          lastOrderAt: new Date(),
          ...(phone ? { phone } : {}),
        },
      })
      .catch(() => {});
    void sendBotMessage(
      restaurant.botToken,
      tgChatId,
      `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\nBuyurtma #${number}\n💰 Jami: ${formatPrice(total, restaurant.currency)}\n\nHolat o'zgarishi haqida shu yerda xabar beramiz.`
    );
  }

  // Restoranда POS ulangan bo'lsa — buyurtmani POS ga ham yuboramiz.
  // Xato bo'lsa mijoz buyurtmasi buzilmaydi (posError ga yoziladi).
  await pushOrderToPos({
    id: order.id,
    restaurantId: restaurant.id,
    tableCode: tableCode || null,
    phone: phone || null,
    comment: comment || null,
    items: orderItems.map((o) => ({ productId: o.productId, qty: o.qty })),
  });

  // Restoran Telegram kanaliga buyurtmani yuboramiz (ulangan bo'lsa, fon rejimda)
  if (restaurant.orderBotToken && restaurant.orderChatId) {
    void sendOrderToChannel({
      token: restaurant.orderBotToken,
      chatId: restaurant.orderChatId,
      restaurantName: restaurant.name,
      currency: restaurant.currency,
      order: {
        number: order.number,
        orderType: order.orderType,
        tableName,
        phone: phone || null,
        comment: comment || null,
        total,
        address: order.address,
        lat: order.lat,
        lng: order.lng,
        waiterName,
        waiterCode: waiterCodeStored,
      },
      items: orderItems,
    });
  }

  // Restoranning webhooklariga "order.created" hodisasini yuboramiz (fon rejimda)
  void dispatchWebhook(restaurant.id, "order.created", {
    id: order.id,
    number: order.number,
    total,
    tableCode: tableCode || null,
    tableName,
    phone: phone || null,
    comment: comment || null,
    orderType: order.orderType,
    address: order.address,
    lat: order.lat,
    lng: order.lng,
    items: orderItems,
    status: order.status,
  });

  const result = { id: order.id, number: order.number, total };
  if (idemKey) idempotentSet(`order:${slug}:${idemKey}`, result);
  return ok(result, 201);
}

// ─── Owner: buyurtmalar ro'yxati ───
export async function GET(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const sinceId = sp.get("sinceId"); // yangi buyurtmalarni bilish uchun
  const cursor = sp.get("cursor"); // sahifalash (oxirgi ko'rilgan order id)
  const rawLimit = parseInt(sp.get("limit") || "", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 100;

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // keyingi sahifa bor-yo'qligini bilish uchun bittasi ortiq
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | null = null;
  if (orders.length > limit) {
    orders.pop();
    nextCursor = orders[orders.length - 1]?.id ?? null;
  }

  return ok({
    orders,
    nextCursor,
    latestId: orders[0]?.id ?? null,
    hasNew: sinceId ? orders.some((o) => o.id === sinceId) === false && orders.length > 0 : false,
  });
}
