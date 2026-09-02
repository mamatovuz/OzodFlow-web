import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Ofitsant paneli — stollar va ularning holati.
// FREE (bo'sh) | ACTIVE (buyurtma bor, tayyorlanmoqda) | BILL (hammasi yetkazildi — to'lov kutilmoqda)
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [tables, openOrders, myPaid] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        paymentStatus: "UNPAID",
        status: { not: "CANCELLED" },
        tableCode: { not: null },
      },
      select: { tableCode: true, status: true, total: true },
    }),
    // Shu xodim bugun olgan va to'langan buyurtmalar (bugungi savdo)
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        staffId: user.id,
        paymentStatus: "PAID",
        paidAt: { gte: todayStart },
      },
      select: { total: true },
    }),
  ]);

  // Stol bo'yicha guruhlash
  const byTable = new Map<string, { count: number; total: number; allDelivered: boolean }>();
  for (const o of openOrders) {
    if (!o.tableCode) continue;
    const cur = byTable.get(o.tableCode) ?? { count: 0, total: 0, allDelivered: true };
    cur.count += 1;
    cur.total += o.total;
    if (o.status !== "DELIVERED") cur.allDelivered = false;
    byTable.set(o.tableCode, cur);
  }

  const rows = tables.map((t) => {
    const agg = byTable.get(t.code);
    const status = !agg ? "FREE" : agg.allDelivered ? "BILL" : "ACTIVE";
    return {
      id: t.id,
      name: t.name,
      code: t.code,
      status,
      orders: agg?.count ?? 0,
      total: agg?.total ?? 0,
    };
  });

  const activeCount = rows.filter((r) => r.status !== "FREE").length;
  const todaySales = myPaid.reduce((s, o) => s + o.total, 0);
  return ok({
    tables: rows,
    activeCount,
    currency: restaurant.currency,
    todaySales,
    todayOrders: myPaid.length,
    name: user.name,
  });
}
