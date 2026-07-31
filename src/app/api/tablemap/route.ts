import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, getMembership, ok, fail } from "@/lib/api";

// Stol xaritasi: har stol statusi va statistikasi
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  let rid: string | null = (await getUserRestaurant(user.id))?.id ?? null;
  if (!rid) rid = (await getMembership(user.id))?.restaurant.id ?? null;
  if (!rid) return fail("Restoran topilmadi", 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [tables, calls, orders] = await Promise.all([
    prisma.restaurantTable.findMany({ where: { restaurantId: rid }, orderBy: { createdAt: "asc" } }),
    prisma.serviceCall.findMany({ where: { restaurantId: rid, status: "ACTIVE" } }),
    prisma.order.findMany({
      where: { restaurantId: rid, createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ACTIVE = ["NEW", "ACCEPTED", "PREPARING", "READY"];

  const map = tables.map((t) => {
    const tCalls = calls.filter((c) => c.tableCode === t.code);
    const tOrders = orders.filter((o) => o.tableCode === t.code);
    const activeOrders = tOrders.filter((o) => ACTIVE.includes(o.status));

    let status = "EMPTY";
    if (tCalls.some((c) => c.type === "WAITER")) status = "WAITER";
    else if (tCalls.some((c) => c.type === "BILL")) status = "BILL";
    else if (activeOrders.some((o) => o.status === "READY")) status = "READY";
    else if (activeOrders.some((o) => o.status === "NEW")) status = "NEW";
    else if (activeOrders.length > 0) status = "PREPARING";

    const total = tOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + o.total, 0);

    return {
      id: t.id,
      name: t.name,
      code: t.code,
      status,
      orderCount: tOrders.length,
      activeCount: activeOrders.length,
      total,
      lastOrderAt: tOrders[0]?.createdAt ?? null,
      calls: tCalls.map((c) => ({ id: c.id, type: c.type })),
    };
  });

  return ok(map);
}
