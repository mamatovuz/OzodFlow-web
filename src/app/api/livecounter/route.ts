import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, getMembership, ok, fail } from "@/lib/api";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  let rid: string | null = (await getUserRestaurant(user.id))?.id ?? null;
  if (!rid) rid = (await getMembership(user.id))?.restaurant.id ?? null;
  if (!rid) return fail("Restoran topilmadi", 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const online = new Date(Date.now() - 40 * 1000);

  const [viewers, todayScans, activeOrders, busyTablesRows, staff] = await Promise.all([
    prisma.presence.count({ where: { restaurantId: rid, lastSeen: { gte: online } } }),
    prisma.scanEvent.count({ where: { restaurantId: rid, createdAt: { gte: today } } }),
    prisma.order.count({
      where: { restaurantId: rid, status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] } },
    }),
    prisma.order.findMany({
      where: { restaurantId: rid, status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] }, tableCode: { not: null } },
      select: { tableCode: true },
      distinct: ["tableCode"],
    }),
    prisma.membership.count({ where: { restaurantId: rid } }),
  ]);

  return ok({
    viewers,
    todayScans,
    activeOrders,
    busyTables: busyTablesRows.length,
    staff,
  });
}
