import { prisma } from "./prisma";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getDashboardStats(restaurantId: string) {
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [
    todayScans,
    weekScans,
    monthScans,
    activeProducts,
    categories,
    lastUpdated,
    restaurant,
    todayOrders,
    todayRevenueAgg,
    activeOrders,
  ] = await Promise.all([
    prisma.scanEvent.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),
    prisma.scanEvent.count({
      where: { restaurantId, createdAt: { gte: weekAgo } },
    }),
    prisma.scanEvent.count({
      where: { restaurantId, createdAt: { gte: monthAgo } },
    }),
    prisma.product.count({
      where: { restaurantId, isVisible: true },
    }),
    prisma.category.count({ where: { restaurantId } }),
    prisma.product.findFirst({
      where: { restaurantId },
      orderBy: { updatedAt: "desc" },
      select: { name: true, updatedAt: true },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { plan: true, planUntil: true },
    }),
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] },
      },
    }),
  ]);

  // Haftalik grafik uchun kunlik taqsimot
  const events = await prisma.scanEvent.findMany({
    where: { restaurantId, createdAt: { gte: weekAgo } },
    select: { createdAt: true },
  });
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const count = events.filter(
      (e) => e.createdAt >= day && e.createdAt < next
    ).length;
    return {
      label: ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"][day.getDay()],
      count,
    };
  });

  return {
    todayScans,
    weekScans,
    monthScans,
    activeProducts,
    categories,
    lastUpdated,
    plan: restaurant?.plan ?? "FREE",
    planUntil: restaurant?.planUntil ?? null,
    daily,
    todayOrders,
    todayRevenue: todayRevenueAgg._sum.total ?? 0,
    activeOrders,
  };
}

// ─── Bosh sahifa "Ishonch raqamlari" uchun haqiqiy (jonli) ko'rsatkichlar ───
export type SiteMetric = "restaurants" | "products" | "scans";

/** Platformadagi haqiqiy sonlar: restoranlar, menyu mahsulotlari, QR skanerlar. */
export async function getSiteMetricCounts(): Promise<Record<SiteMetric, number>> {
  const [restaurants, products, scans] = await Promise.all([
    prisma.restaurant.count(),
    prisma.product.count(),
    prisma.scanEvent.count(),
  ]);
  return { restaurants, products, scans };
}

/**
 * Katta sonni ixcham ko'rinishga keltiradi: 1234 → "1.2K+", 1_200_000 → "1.2M+".
 * Bosh sahifadagi "500+" uslubidagi ko'rsatkichlar uchun.
 */
export function formatMetricValue(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M+`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}K+`;
  }
  return `${n}+`;
}

export async function getTopProducts(restaurantId: string, limit = 5) {
  return prisma.product.findMany({
    where: { restaurantId },
    orderBy: { views: "desc" },
    take: limit,
    select: { id: true, name: true, views: true },
  });
}
