import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Ofitsant stol hisobini to'laydi — naqd, karta yoki aralash.
// Chegirma va xizmat haqi (bo'lsa) yakuniy summaga qo'llanadi.
// Stolning barcha to'lanmagan buyurtmalari PAID + DELIVERED bo'ladi.
const schema = z.object({
  tableCode: z.string().min(1),
  method: z.enum(["CASH", "CARD", "MIXED"]),
  cash: z.number().min(0).optional(),
  card: z.number().min(0).optional(),
  // Chegirma: summa (so'm) va turi (audit uchun)
  discount: z.number().min(0).optional(),
  discountType: z.enum(["PERCENT", "AMOUNT"]).optional(),
  // Xizmat haqi: summa (so'm)
  service: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);
  const { tableCode, method } = parsed.data;

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      tableCode,
      paymentStatus: "UNPAID",
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, total: true },
  });
  if (orders.length === 0) return fail("To'lanmagan buyurtma yo'q", 404);

  const subtotal = orders.reduce((s, o) => s + o.total, 0);

  // Chegirma va xizmat haqini chegaralaymiz (summadan oshmasin)
  const discount = Math.min(Math.max(0, parsed.data.discount ?? 0), subtotal);
  const service = Math.max(0, parsed.data.service ?? 0);
  const total = Math.max(0, subtotal - discount + service);

  // To'lov qismlarini aniqlaymiz
  let paidCash = 0;
  let paidCard = 0;
  if (method === "CASH") paidCash = total;
  else if (method === "CARD") paidCard = total;
  else {
    paidCash = Math.max(0, parsed.data.cash ?? 0);
    paidCard = Math.max(0, parsed.data.card ?? 0);
    // Aralashda qismlar jami yakuniy summaga teng bo'lishi kerak (kichik xatoga yo'l qo'yamiz)
    if (Math.abs(paidCash + paidCard - total) > 1) {
      return fail(`Naqd va karta yig'indisi ${total} bo'lishi kerak`, 422);
    }
  }

  const paidAt = new Date();

  // Chegirma/xizmat haqi farqini (delta) oxirgi buyurtmaga yozamiz — shunda
  // stol bo'yicha sum(total) yakuniy summaga (haqiqiy tushum) teng bo'ladi.
  const delta = service - discount; // total - subtotal
  const lastId = orders[orders.length - 1].id;
  const lastOrder = orders[orders.length - 1];

  await prisma.$transaction([
    // Barcha buyurtmalarni to'langan + yetkazilgan qilamiz
    prisma.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: {
        paymentStatus: "PAID",
        paymentMethod: method,
        paidAt,
        status: "DELIVERED",
      },
    }),
    // Chegirma/servis ma'lumotini va delta bilan tuzatilgan total'ni oxirgi buyurtmaga yozamiz
    prisma.order.update({
      where: { id: lastId },
      data: {
        total: Math.max(0, lastOrder.total + delta),
        discount,
        discountType: parsed.data.discountType ?? (discount > 0 ? "AMOUNT" : null),
        serviceCharge: service,
        // To'lov qismlarini oxirgi buyurtmaga yozamiz (chek uchun)
        paidCash,
        paidCard,
      },
    }),
  ]);

  return ok({ count: orders.length, subtotal, discount, service, total, method, paidCash, paidCard });
}
