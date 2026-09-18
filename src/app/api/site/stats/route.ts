import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);

  const [posts, agg, pendingComments, unreadMessages, subscribers, daily] = await Promise.all([
    prisma.sitePost.findMany({
      orderBy: { views: "desc" },
      select: { id: true, title: true, slug: true, views: true, likes: true, dislikes: true, status: true },
    }),
    prisma.sitePost.aggregate({ _sum: { views: true, likes: true, dislikes: true } }),
    prisma.siteComment.count({ where: { approved: false } }),
    prisma.siteMessage.count({ where: { read: false } }),
    prisma.siteSubscriber.count(),
    prisma.siteDailyStat.findMany({ orderBy: { day: "desc" }, take: 7 }),
  ]);

  // Oxirgi 7 kun (bo'sh kunlarni 0 bilan to'ldiramiz)
  const map = new Map(daily.map((d) => [d.day, d.views]));
  const days: { day: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    days.push({ day: key, views: map.get(key) || 0 });
  }

  return ok({
    totals: {
      posts: posts.length,
      published: posts.filter((p) => p.status !== "DRAFT").length,
      drafts: posts.filter((p) => p.status === "DRAFT").length,
      views: agg._sum.views || 0,
      likes: agg._sum.likes || 0,
      dislikes: agg._sum.dislikes || 0,
      pendingComments,
      unreadMessages,
      subscribers,
    },
    topPosts: posts.slice(0, 5),
    days,
  });
}
