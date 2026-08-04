import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { pushOrderToPos } from "@/lib/pos";
import type { OrderItem } from "@/lib/orders";

// ─── Ommaviy: buyurtma yaratish ───
const createSchema = z.object({
  slug: z.string().min(1),
  tableCode: z.string().optional().nullable(),
  phone: z.string().optional(),
  comment: z.string().optional(),
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
  const { slug, tableCode, phone, comment, items } = parsed.data;

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
      status: "NEW",
      total,
      items: JSON.stringify(orderItems),
    },
  });

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

  return ok({ id: order.id, number: order.number, total }, 201);
}

// ─── Owner: buyurtmalar ro'yxati ───
export async function GET(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const status = req.nextUrl.searchParams.get("status");
  const sinceId = req.nextUrl.searchParams.get("sinceId"); // yangi buyurtmalarni bilish uchun

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({
    orders,
    latestId: orders[0]?.id ?? null,
    hasNew: sinceId ? orders.some((o) => o.id === sinceId) === false && orders.length > 0 : false,
  });
}
