import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { sendOrderToChannel } from "@/lib/order-telegram";
import type { OrderItem } from "@/lib/orders";

// Ofitsant panel orqali buyurtma yaratadi (stolga taom qo'shib, oshxonaga yuboradi).
const schema = z.object({
  tableCode: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).max(99),
        comment: z.string().max(200).optional().nullable(),
      })
    )
    .min(1, "Kamida bitta taom tanlang"),
});

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  const { tableCode, items } = parsed.data;

  // Mahsulotlar + kategoriya nomlari (narxni bazadan olamiz)
  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
    select: { id: true, name: true, price: true, category: { select: { name: true } } },
  });

  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) continue;
    orderItems.push({
      productId: p.id,
      name: p.name,
      price: p.price,
      qty: it.qty,
      categoryName: p.category?.name ?? null,
      comment: it.comment?.trim() || null,
    });
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
      status: "NEW",
      total,
      items: JSON.stringify(orderItems),
      staffId: user.id,
      waiterName: user.name,
    },
  });

  // Telegram kanaliga xabar (ulangan bo'lsa)
  if (restaurant.orderBotToken && restaurant.orderChatId) {
    void sendOrderToChannel({
      token: restaurant.orderBotToken,
      chatId: restaurant.orderChatId,
      restaurantName: restaurant.name,
      currency: restaurant.currency,
      order: {
        number: order.number,
        orderType: "DINE_IN",
        tableName,
        phone: null,
        comment: null,
        total,
        address: null,
        lat: null,
        lng: null,
        waiterName: user.name,
        waiterCode: null,
      },
      items: orderItems,
    });
  }

  return ok({ id: order.id, number: order.number, total }, 201);
}
