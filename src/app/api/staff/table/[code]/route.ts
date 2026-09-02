import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Bitta stolning joriy hisobi — to'lanmagan (faol) buyurtmalar + jami.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  const { code } = await params;

  const table = await prisma.restaurantTable.findFirst({
    where: { code, restaurantId: restaurant.id },
    select: { name: true, code: true },
  });
  if (!table) return fail("Stol topilmadi", 404);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      tableCode: code,
      paymentStatus: "UNPAID",
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, status: true, total: true, items: true, waiterName: true, createdAt: true },
  });

  const total = orders.reduce((s, o) => s + o.total, 0);
  return ok({
    table,
    orders,
    total,
    currency: restaurant.currency,
    card: { number: restaurant.cardNumber, holder: restaurant.cardHolder },
  });
}
