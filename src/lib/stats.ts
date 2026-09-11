import { prisma } from "./prisma";
import { parseJson } from "./utils";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getDashboardStats(restaurantId: string) {
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const DAY_MS = 24 * 60 * 60 * 1000;
  const yesterday = new Date(today.getTime() - DAY_MS);
  const twoWeeksAgo = new Date(today.getTime() - 13 * DAY_MS);

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

  // Haftalik grafik uchun kunlik taqsimot (skanerlar)
  const events = await prisma.scanEvent.findMany({
    where: { restaurantId, createdAt: { gte: weekAgo } },
    select: { createdAt: true },
  });
  // Haftalik buyurtmalar (daromad grafigi + naqd/karta taqsimoti uchun)
  const weekOrders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: weekAgo } },
    select: {
      createdAt: true, total: true, status: true,
      paymentStatus: true, paidCash: true, paidCard: true,
    },
  });
  const monthRevenueAgg = await prisma.order.aggregate({
    where: { restaurantId, createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });

  // Kecha bilan solishtirish uchun kechagi savdo + buyurtma
  const [yesterdayAgg, yesterdayOrders, prevWeekAgg, prepRows] = await Promise.all([
    prisma.order.aggregate({
      where: { restaurantId, createdAt: { gte: yesterday, lt: today }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: yesterday, lt: today } },
    }),
    // Oldingi 7 kun (bugungi haftadan oldingi) — haftalik trend uchun
    prisma.order.aggregate({
      where: { restaurantId, createdAt: { gte: twoWeeksAgo, lt: weekAgo }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    // Oshxona tayyorlash vaqti (oxirgi 7 kun, READY belgilangan buyurtmalar)
    prisma.order.findMany({
      where: { restaurantId, readyAt: { not: null }, createdAt: { gte: weekAgo } },
      select: { createdAt: true, readyAt: true },
    }),
  ]);

  // O'rtacha tayyorlash vaqti (daqiqa)
  const prepDurations = prepRows
    .map((o) => (o.readyAt ? (+o.readyAt - +o.createdAt) / 60000 : 0))
    .filter((m) => m > 0 && m < 300); // 5 soatdan uzunini chiqindi deb tashlaymiz
  const avgPrepMins = prepDurations.length
    ? Math.round(prepDurations.reduce((s, m) => s + m, 0) / prepDurations.length)
    : 0;

  const DAY = 24 * 60 * 60 * 1000;
  const dayName = ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"];
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekAgo.getTime() + i * DAY);
    const next = new Date(day.getTime() + DAY);
    const count = events.filter((e) => e.createdAt >= day && e.createdAt < next).length;
    const revenue = weekOrders
      .filter((o) => o.status !== "CANCELLED" && o.createdAt >= day && o.createdAt < next)
      .reduce((s, o) => s + o.total, 0);
    return { label: dayName[day.getDay()], count, revenue };
  });

  const notCancelled = weekOrders.filter((o) => o.status !== "CANCELLED");
  const weekRevenue = notCancelled.reduce((s, o) => s + o.total, 0);
  const todayNonCancelled = notCancelled.filter((o) => o.createdAt >= today);
  const todayCash = todayNonCancelled.reduce((s, o) => s + (o.paidCash ?? 0), 0);
  const todayCard = todayNonCancelled.reduce((s, o) => s + (o.paidCard ?? 0), 0);
  const todayRevenue = todayRevenueAgg._sum.total ?? 0;
  const avgCheck = todayNonCancelled.length ? Math.round(todayRevenue / todayNonCancelled.length) : 0;

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
    todayRevenue,
    activeOrders,
    // ─── Kengaytirilgan savdo ko'rsatkichlari ───
    weekRevenue,
    monthRevenue: monthRevenueAgg._sum.total ?? 0,
    todayCash,
    todayCard,
    avgCheck,
    // ─── Trend (solishtirish) ───
    yesterdayRevenue: yesterdayAgg._sum.total ?? 0,
    yesterdayOrders,
    prevWeekRevenue: prevWeekAgg._sum.total ?? 0,
    // ─── Oshxona samaradorligi ───
    avgPrepMins,
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

// ─── Eng ko'p BUYURTMA qilingan taomlar (oxirgi 30 kun, Order.items JSON'idan) ───
type OrderItemLite = { productId?: string; name?: string; qty?: number; price?: number };

export async function getMostOrdered(restaurantId: string, limit = 8) {
  const monthAgo = new Date(startOfDay().getTime() - 29 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } },
    select: { items: true },
  });
  const tally = new Map<string, { name: string; qty: number }>();
  for (const o of orders) {
    let items: OrderItemLite[] = [];
    try {
      items = JSON.parse(o.items || "[]");
    } catch {
      items = [];
    }
    for (const it of items) {
      const name = (it.name || "").trim();
      if (!name) continue;
      const key = it.productId || name;
      const qty = Number(it.qty) || 0;
      const cur = tally.get(key) || { name, qty: 0 };
      cur.qty += qty;
      tally.set(key, cur);
    }
  }
  return [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

// ─── Eng faol soatlar (oxirgi 30 kun skanerlaridan, eng gavjum 2 soatlik oyna) ───
export async function getPeakHours(restaurantId: string) {
  const monthAgo = new Date(startOfDay().getTime() - 29 * 24 * 60 * 60 * 1000);
  const events = await prisma.scanEvent.findMany({
    where: { restaurantId, createdAt: { gte: monthAgo } },
    select: { createdAt: true },
  });
  const hours = new Array(24).fill(0) as number[];
  for (const e of events) hours[new Date(e.createdAt).getHours()]++;
  // Eng gavjum 2 soatlik oyna
  let bestStart = 12;
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const sum = hours[h] + hours[(h + 1) % 24];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = h;
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = bestSum > 0 ? `${pad(bestStart)}:00 — ${pad((bestStart + 2) % 24)}:00` : "—";
  return { hours, label, total: events.length };
}

// ─── Xodimlar (ofitsant) reytingi — savdo bo'yicha (oxirgi 30 kun) ───
// Buyurtmani kim qabul qilgani (waiterName) bo'yicha guruhlaymiz — bu ham kod tizimi
// (Waiter), ham panelга login qilgan xodimlar (staffId) uchun ishlaydi.
export async function getStaffLeaderboard(restaurantId: string, limit = 8) {
  const monthAgo = new Date(startOfDay().getTime() - 29 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: monthAgo },
      status: { not: "CANCELLED" },
      waiterName: { not: null },
    },
    select: { waiterName: true, total: true, items: true },
  });
  const agg = new Map<string, { name: string; orders: number; dishes: number; total: number }>();
  for (const o of orders) {
    const name = (o.waiterName || "").trim();
    if (!name) continue;
    const cur = agg.get(name) || { name, orders: 0, dishes: 0, total: 0 };
    cur.orders += 1;
    cur.total += o.total;
    const items = parseJson<{ qty?: number }[]>(o.items, []);
    cur.dishes += items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    agg.set(name, cur);
  }
  return [...agg.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

// ─── Filiallar (multi-branch) umumiy ko'rinishi ───
// Egaga tegishli barcha restoranlar + har biri uchun bugungi savdo/buyurtma/skan.
export async function getBranchesOverview(ownerId: string) {
  const today = startOfDay();
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, currency: true, logo: true, plan: true, isBlocked: true },
  });

  const branches = await Promise.all(
    restaurants.map(async (r) => {
      const [orders, revenueAgg, scans, products] = await Promise.all([
        prisma.order.count({ where: { restaurantId: r.id, createdAt: { gte: today } } }),
        prisma.order.aggregate({
          where: { restaurantId: r.id, createdAt: { gte: today }, status: { not: "CANCELLED" } },
          _sum: { total: true },
        }),
        prisma.scanEvent.count({ where: { restaurantId: r.id, createdAt: { gte: today } } }),
        prisma.product.count({ where: { restaurantId: r.id, isVisible: true } }),
      ]);
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        currency: r.currency,
        logo: r.logo,
        plan: r.plan,
        isBlocked: r.isBlocked,
        todayOrders: orders,
        todayRevenue: revenueAgg._sum.total ?? 0,
        todayScans: scans,
        products,
      };
    })
  );

  const totalRevenue = branches.reduce((s, b) => s + b.todayRevenue, 0);
  const totalOrders = branches.reduce((s, b) => s + b.todayOrders, 0);
  const totalScans = branches.reduce((s, b) => s + b.todayScans, 0);
  const best = branches.reduce<(typeof branches)[number] | null>(
    (top, b) => (!top || b.todayRevenue > top.todayRevenue ? b : top),
    null
  );
  const currency = branches[0]?.currency ?? "UZS";

  return { branches, totalRevenue, totalOrders, totalScans, best, currency };
}

// ─── Har bir stol bo'yicha statistika (skaner + buyurtma + daromad) — QR kuzatuvi ───
export async function getTableStats(restaurantId: string) {
  const monthAgo = new Date(startOfDay().getTime() - 29 * 24 * 60 * 60 * 1000);
  const [tables, orders] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, code: true, scans: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } },
      select: { tableCode: true, tableName: true, total: true },
    }),
  ]);
  const byCode = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.tableCode) continue;
    const cur = byCode.get(o.tableCode) || { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += o.total;
    byCode.set(o.tableCode, cur);
  }
  return tables
    .map((t) => {
      const agg = byCode.get(t.code) || { orders: 0, revenue: 0 };
      return { id: t.id, name: t.name, scans: t.scans, orders: agg.orders, revenue: agg.revenue };
    })
    .sort((a, b) => b.orders - a.orders || b.scans - a.scans);
}
