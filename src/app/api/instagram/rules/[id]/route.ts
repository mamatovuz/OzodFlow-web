import { prisma } from "@/lib/prisma";
import { ok, fail, route, readJson, ApiError } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { ruleSchema, type RuleInput } from "../schema";
import { buildRuleData, serializeRule } from "../helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function guard(id: string) {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return { res: fail("Avtorizatsiya talab qilinadi", 401) };
  if (acc.error === "FORBIDDEN") return { res: fail("Ruxsat yo'q", 403) };
  const rule = await prisma.instagramRule.findFirst({
    where: { id, restaurantId: acc.restaurant.id },
  });
  if (!rule) return { res: fail("Qoida topilmadi", 404) };
  return { restaurantId: acc.restaurant.id };
}

// ─── Bitta qoida ───
export const GET = route(async (_req, ctx) => {
  const { id } = await ctx.params;
  const g = await guard(id);
  if (g.res) return g.res;

  const rule = await prisma.instagramRule.findUnique({
    where: { id },
    include: {
      keywords: true,
      messages: { include: { buttons: { orderBy: { sortOrder: "asc" } } }, orderBy: { step: "asc" } },
      _count: { select: { logs: true } },
    },
  });
  if (!rule) throw new ApiError("Qoida topilmadi", 404);
  return ok({ rule: serializeRule(rule) });
});

// ─── Qoidani to'liq yangilash (bolalar qayta yaratiladi) ───
export const PUT = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const g = await guard(id);
  if (g.res) return g.res;

  const input = (await readJson(req, ruleSchema)) as RuleInput;
  const data = buildRuleData(g.restaurantId!, input);

  // Eski keyword/message/button'larni o'chirib, yangidan yaratamiz (idempotent tahrir)
  const rule = await prisma.$transaction(async (tx) => {
    await tx.instagramKeyword.deleteMany({ where: { ruleId: id } });
    await tx.instagramMessage.deleteMany({ where: { ruleId: id } }); // button'lar cascade o'chadi
    return tx.instagramRule.update({
      where: { id },
      data: {
        name: data.name,
        trigger: data.trigger,
        matchType: data.matchType,
        caseSensitive: data.caseSensitive,
        enabled: data.enabled,
        priority: data.priority,
        scope: data.scope,
        postId: data.postId,
        postCaption: data.postCaption,
        commentReply: data.commentReply,
        delaySec: data.delaySec,
        randomDelay: data.randomDelay,
        cooldownHours: data.cooldownHours,
        schedule: data.schedule,
        keywords: data.keywords,
        messages: data.messages,
      },
      include: {
        keywords: true,
        messages: { include: { buttons: { orderBy: { sortOrder: "asc" } } }, orderBy: { step: "asc" } },
      },
    });
  });

  return ok({ rule: serializeRule(rule) });
});

// ─── Tez o'zgartirish (enabled toggle va h.k.) ───
const patchSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(99).optional(),
});
export const PATCH = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const g = await guard(id);
  if (g.res) return g.res;
  const input = await readJson(req, patchSchema);
  const rule = await prisma.instagramRule.update({ where: { id }, data: input });
  return ok({ id: rule.id, enabled: rule.enabled, priority: rule.priority });
});

// ─── O'chirish ───
export const DELETE = route(async (_req, ctx) => {
  const { id } = await ctx.params;
  const g = await guard(id);
  if (g.res) return g.res;
  await prisma.instagramRule.delete({ where: { id } });
  return ok({ removed: true });
});
