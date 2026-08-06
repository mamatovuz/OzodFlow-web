import { prisma } from "@/lib/prisma";
import { ok, fail, route } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// ─── Automatlashtirish loglari (qidiruv + sahifalash) ───
export const GET = route(async (req) => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status")?.trim();
  const trigger = sp.get("trigger")?.trim();
  const ruleId = sp.get("ruleId")?.trim();
  const cursor = sp.get("cursor");
  const limit = Math.min(50, Math.max(5, parseInt(sp.get("limit") || "20", 10)));

  const where: Prisma.InstagramLogWhereInput = { restaurantId: acc.restaurant.id };
  if (status) where.status = status;
  if (trigger) where.trigger = trigger;
  if (ruleId) where.ruleId = ruleId;
  if (q) {
    where.OR = [
      { igUsername: { contains: q } },
      { commentText: { contains: q } },
      { replyText: { contains: q } },
    ];
  }

  const rows = await prisma.instagramLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { rule: { select: { name: true } } },
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    trigger: r.trigger,
    igUsername: r.igUsername,
    mediaId: r.mediaId,
    commentText: r.commentText,
    replyText: r.replyText,
    status: r.status,
    reason: r.reason,
    ruleName: r.rule?.name ?? null,
    createdAt: r.createdAt,
  }));

  return ok({ items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null });
});
