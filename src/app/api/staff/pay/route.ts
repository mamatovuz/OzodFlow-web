import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Ofitsant stol hisobini to'laydi — naqd, karta yoki aralash.
// Stolning barcha to'lanmagan buyurtmalari PAID + DELIVERED bo'ladi.
const schema = z.object({
  tableCode: z.string().min(1),
  method: z.enum(["CASH", "CARD", "MIXED"]),
  cash: z.number().min(0).optional(),
  card: z.number().min(0).optional(),
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
    select: { id: true, total: true },
  });
  if (orders.length === 0) return fail("To'lanmagan buyurtma yo'q", 404);

  const total = orders.reduce((s, o) => s + o.total, 0);

  // To'lov qismlarini aniqlaymiz
  let paidCash = 0;
  let paidCard = 0;
  if (method === "CASH") paidCash = total;
  else if (method === "CARD") paidCard = total;
  else {
    paidCash = Math.max(0, parsed.data.cash ?? 0);
    paidCard = Math.max(0, parsed.data.card ?? 0);
    // Aralashda qismlar jami summaga teng bo'lishi kerak (kichik xatoga yo'l qo'yamiz)
    if (Math.abs(paidCash + paidCard - total) > 1) {
      return fail(`Naqd va karta yig'indisi ${total} bo'lishi kerak`, 422);
    }
  }

  const paidAt = new Date();
  await prisma.order.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: {
      paymentStatus: "PAID",
      paymentMethod: method,
      paidCash,
      paidCard,
      paidAt,
      status: "DELIVERED",
    },
  });

  return ok({ count: orders.length, total, method, paidCash, paidCard });
}
