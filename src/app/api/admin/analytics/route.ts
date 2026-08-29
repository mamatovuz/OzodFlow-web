import { prisma } from "@/lib/prisma";
import { route, ok, adminGuard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Period = "today" | "7d" | "30d" | "all";

function sinceFor(period: Period): Date | null {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "7d") return new Date(now.getTime() - 7 * 864e5);
  if (period === "30d") return new Date(now.getTime() - 30 * 864e5);
  return null; // all
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export const GET = route(async (req) => {
  const { res } = await adminGuard("analytics");
  if (res) return res;

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") || "7d") as Period;
  const since = sinceFor(period);
  const whereCreated = since ? { createdAt: { gte: since } } : {};

  // Grafik oynasi (kunlar soni)
  const chartDays = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const chartStart = new Date();
  chartStart.setHours(0, 0, 0, 0);
  chartStart.setDate(chartStart.getDate() - (chartDays - 1));

  const [
    siteVisits,
    visitorGroups,
    menuScans,
    scanVisitorGroups,
    newRestaurants,
    newUsers,
    orders,
    ordersAgg,
    platformAgg,
    totalRestaurants,
    totalUsers,
    planGroups,
    topPageGroups,
    topScanGroups,
    recentRestaurants,
    visitRows,
    scanRows,
  ] = await Promise.all([
    prisma.siteVisit.count({ where: whereCreated }),
    prisma.siteVisit.groupBy({
      by: ["visitorId"],
      where: { ...whereCreated, visitorId: { not: null } },
    }),
    prisma.scanEvent.count({ where: whereCreated }),
    prisma.scanEvent.groupBy({
      by: ["visitorId"],
      where: { ...whereCreated, visitorId: { not: null } },
    }),
    prisma.restaurant.count({ where: whereCreated }),
    prisma.user.count({ where: { ...whereCreated, role: { not: "ADMIN" } } }),
    prisma.order.count({ where: whereCreated }),
    prisma.order.aggregate({
      where: { ...whereCreated, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.paymentRequest.aggregate({
      where: {
        status: "APPROVED",
        ...(since ? { reviewedAt: { gte: since } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.restaurant.count(),
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.restaurant.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.siteVisit.groupBy({
      by: ["path"],
      where: whereCreated,
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.scanEvent.groupBy({
      by: ["restaurantId"],
      where: whereCreated,
      _count: { _all: true },
      orderBy: { _count: { restaurantId: "desc" } },
      take: 6,
    }),
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, slug: true, plan: true, createdAt: true },
    }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
    }),
    prisma.scanEvent.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
    }),
  ]);

  // Top restoranlar nomlari
  const topIds = topScanGroups.map((g) => g.restaurantId);
  const topNames = topIds.length
    ? await prisma.restaurant.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const nameMap = new Map(topNames.map((r) => [r.id, r]));

  // Kunlik grafik: tashrif + skanerlarni kun bo'yicha guruhlash
  const days: { date: string; visits: number; scans: number }[] = [];
  for (let i = 0; i < chartDays; i++) {
    const d = new Date(chartStart);
    d.setDate(chartStart.getDate() + i);
    days.push({ date: dayKey(d), visits: 0, scans: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const v of visitRows) {
    const k = dayKey(new Date(v.createdAt));
    const i = idx.get(k);
    if (i !== undefined) days[i].visits++;
  }
  for (const s of scanRows) {
    const k = dayKey(new Date(s.createdAt));
    const i = idx.get(k);
    if (i !== undefined) days[i].scans++;
  }

  return ok({
    period,
    kpis: {
      siteVisits,
      uniqueVisitors: visitorGroups.length,
      menuScans,
      uniqueMenuVisitors: scanVisitorGroups.length,
      newRestaurants,
      newUsers,
      orders,
      ordersRevenue: ordersAgg._sum.total || 0,
      platformRevenue: platformAgg._sum.amount || 0,
    },
    totals: { restaurants: totalRestaurants, users: totalUsers },
    chart: days,
    plans: planGroups.map((g) => ({ plan: g.plan, count: g._count._all })),
    topPages: topPageGroups.map((g) => ({ path: g.path, count: g._count._all })),
    topRestaurants: topScanGroups.map((g) => ({
      id: g.restaurantId,
      name: nameMap.get(g.restaurantId)?.name || "—",
      slug: nameMap.get(g.restaurantId)?.slug || "",
      scans: g._count._all,
    })),
    recent: recentRestaurants,
  });
});
