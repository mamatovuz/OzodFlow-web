import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, parseTags, reactionsTotal } from "@/lib/site";

export const dynamic = "force-dynamic";

// Referrer URL'ini toza manbaga aylantiradi (google.com, t.me, "To'g'ridan-to'g'ri").
function refSource(ref: string | null): string {
  if (!ref) return "To'g'ridan-to'g'ri";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (!h) return "To'g'ridan-to'g'ri";
    if (h.includes("google")) return "Google";
    if (h.includes("t.me") || h.includes("telegram")) return "Telegram";
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("facebook") || h === "fb.com") return "Facebook";
    if (h.includes("youtube")) return "YouTube";
    return h;
  } catch {
    return "Boshqa";
  }
}

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);

  const [posts, agg, pendingComments, unreadMessages, subscribers, daily, visits] = await Promise.all([
    prisma.sitePost.findMany({
      orderBy: { views: "desc" },
      select: { id: true, title: true, slug: true, views: true, reactions: true, status: true, tags: true },
    }),
    prisma.sitePost.aggregate({ _sum: { views: true } }),
    prisma.siteComment.count({ where: { approved: false } }),
    prisma.siteMessage.count({ where: { read: false } }),
    prisma.siteSubscriber.count(),
    prisma.siteDailyStat.findMany({ orderBy: { day: "desc" }, take: 7 }),
    // Blog o'quvchilarining trafik manbai (oxirgi tashriflar)
    prisma.siteVisit.findMany({
      where: { path: { contains: "blog" } },
      orderBy: { createdAt: "desc" },
      select: { referrer: true },
      take: 1000,
    }),
  ]);

  // Top teglar — barcha maqolalar bo'yicha
  const tagCount = new Map<string, number>();
  for (const p of posts) {
    for (const t of parseTags(p.tags)) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  }
  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  // Trafik manbai — referrer bo'yicha guruhlab
  const srcCount = new Map<string, number>();
  for (const v of visits) {
    const src = refSource(v.referrer);
    srcCount.set(src, (srcCount.get(src) || 0) + 1);
  }
  const sources = [...srcCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([source, count]) => ({ source, count }));

  // Oxirgi 7 kun (bo'sh kunlarni 0 bilan to'ldiramiz)
  const map = new Map(daily.map((d) => [d.day, d.views]));
  const days: { day: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    days.push({ day: key, views: map.get(key) || 0 });
  }

  // Emoji reaksiyalar — har post va jami
  const withReactions = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    views: p.views,
    reactions: reactionsTotal(p.reactions),
  }));
  const totalReactions = withReactions.reduce((s, p) => s + p.reactions, 0);

  return ok({
    totals: {
      posts: posts.length,
      published: posts.filter((p) => p.status !== "DRAFT").length,
      drafts: posts.filter((p) => p.status === "DRAFT").length,
      views: agg._sum.views || 0,
      reactions: totalReactions,
      pendingComments,
      unreadMessages,
      subscribers,
    },
    topPosts: withReactions.slice(0, 5),
    topTags,
    sources,
    days,
  });
}
