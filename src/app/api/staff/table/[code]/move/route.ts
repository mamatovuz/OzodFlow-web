import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Stolni ko'chirish / birlashtirish.
// Manba stolning barcha to'lanmagan buyurtmalari maqsad stolga ko'chiriladi.
// Maqsad stolда buyurtma bo'lsa — hisoblar birlashadi (merge).
// Body: { toCode: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const { code } = await params;
  const body = await req.json().catch(() => null);
  const toCode = String(body?.toCode || "").trim();
  if (!toCode) return fail("Maqsad stol tanlanmadi", 422);
  if (toCode === code) return fail("Bir xil stol tanlab bo'lmaydi", 422);

  const [from, to] = await Promise.all([
    prisma.restaurantTable.findFirst({
      where: { code, restaurantId: restaurant.id },
      select: { name: true, code: true },
    }),
    prisma.restaurantTable.findFirst({
      where: { code: toCode, restaurantId: restaurant.id },
      select: { name: true, code: true },
    }),
  ]);
  if (!from) return fail("Manba stol topilmadi", 404);
  if (!to) return fail("Maqsad stol topilmadi", 404);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      tableCode: code,
      paymentStatus: "UNPAID",
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });
  if (orders.length === 0) return fail("Ko'chiriladigan buyurtma yo'q", 404);

  await prisma.order.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: { tableCode: toCode, tableName: to.name },
  });

  return ok({ moved: orders.length, from: from.name, to: to.name });
}
