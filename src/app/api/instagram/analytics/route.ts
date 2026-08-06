import { prisma } from "@/lib/prisma";
import { fail, ok, route } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { getDailyStats } from "@/lib/instagram/stats";

export const dynamic = "force-dynamic";

// ─── To'liq analitika: umumiy, top keyword, top post, top qoida ───
export const GET = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const rid = acc.restaurant.id;

  const [daily, topRules, topPosts, keywords, buttonAgg] = await Promise.all([
    getDailyStats(rid, 30),
    prisma.instagramRule.findMany({
      where: { restaurantId: rid },
      orderBy: { hitCount: "desc" },
      take: 5,
      select: { id: true, name: true, hitCount: true, enabled: true },
    }),
    prisma.instagramLog.groupBy({
      by: ["mediaId"],
      where: { restaurantId: rid, mediaId: { not: null }, status: "SENT" },
      _count: { _all: true },
      orderBy: { _count: { mediaId: "desc" } },
      take: 5,
    }),
    prisma.instagramKeyword.findMany({
      where: { isIgnore: false, rule: { restaurantId: rid } },
      select: { word: true, rule: { select: { hitCount: true } } },
    }),
    prisma.instagramButton.aggregate({
      where: { message: { rule: { restaurantId: rid } } },
      _sum: { clicks: true },
    }),
  ]);

  // Keyword bo'yicha jami (rule hitCount og'irligi bilan)
  const kwMap = new Map<string, number>();
  for (const k of keywords) {
    kwMap.set(k.word, (kwMap.get(k.word) || 0) + (k.rule?.hitCount || 0));
  }
  const topKeywords = [...kwMap.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 30 kunlik yig'indi
  const totals = daily.reduce(
    (acc2, d) => {
      acc2.comments += d.comments;
      acc2.dms += d.dms;
      acc2.replies += d.replies;
      acc2.buttonClicks += d.buttonClicks;
      acc2.conversions += d.conversions;
      return acc2;
    },
    { comments: 0, dms: 0, replies: 0, buttonClicks: 0, conversions: 0 }
  );

  const ctr = totals.replies > 0 ? Math.round((totals.buttonClicks / totals.replies) * 100) : 0;
  const conversionRate = totals.replies > 0 ? Math.round((totals.conversions / totals.replies) * 100) : 0;

  return ok({
    totals: { ...totals, ctr, conversionRate, buttonClicksAllTime: buttonAgg._sum.clicks || 0 },
    daily,
    topRules,
    topKeywords,
    topPosts: topPosts.map((p) => ({ mediaId: p.mediaId, count: p._count._all })),
  });
});
