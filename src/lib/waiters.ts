import { prisma } from "./prisma";
import { parseJson } from "./utils";
import type { OrderItem } from "./orders";

export type WaiterPeriod = "today" | "week" | "month" | "all";

export function periodStart(period: WaiterPeriod): Date | null {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null; // all
}

export type WaiterStatRow = {
  id: string;
  name: string;
  lastName: string | null;
  code: string;
  isActive: boolean;
  orders: number; // buyurtmalar soni
  dishes: number; // sotilgan taomlar soni (qty yig'indisi)
  total: number; // umumiy summa
};

// Ofitsantlar bo'yicha davr statistikasini hisoblaydi.
// Bekor qilingan (CANCELLED) buyurtmalar hisobga olinmaydi.
export async function getWaiterStats(
  restaurantId: string,
  period: WaiterPeriod
): Promise<WaiterStatRow[]> {
  const start = periodStart(period);

  const [waiters, orders] = await Promise.all([
    prisma.waiter.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        waiterId: { not: null },
        status: { not: "CANCELLED" },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      select: { waiterId: true, total: true, items: true },
    }),
  ]);

  const agg = new Map<string, { orders: number; dishes: number; total: number }>();
  for (const o of orders) {
    if (!o.waiterId) continue;
    const cur = agg.get(o.waiterId) ?? { orders: 0, dishes: 0, total: 0 };
    cur.orders += 1;
    cur.total += o.total;
    const items = parseJson<OrderItem[]>(o.items, []);
    cur.dishes += items.reduce((s, it) => s + (it.qty || 0), 0);
    agg.set(o.waiterId, cur);
  }

  return waiters
    .map((w) => {
      const a = agg.get(w.id) ?? { orders: 0, dishes: 0, total: 0 };
      return {
        id: w.id,
        name: w.name,
        lastName: w.lastName,
        code: w.code,
        isActive: w.isActive,
        orders: a.orders,
        dishes: a.dishes,
        total: a.total,
      };
    })
    .sort((a, b) => b.total - a.total);
}
