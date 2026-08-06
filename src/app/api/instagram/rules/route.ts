import { prisma } from "@/lib/prisma";
import { ok, fail, route, readJson } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { ruleSchema, type RuleInput } from "./schema";
import { buildRuleData, serializeRule } from "./helpers";

export const dynamic = "force-dynamic";

// ─── Qoidalar ro'yxati ───
export const GET = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const rules = await prisma.instagramRule.findMany({
    where: { restaurantId: acc.restaurant.id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      keywords: true,
      messages: { include: { buttons: { orderBy: { sortOrder: "asc" } } }, orderBy: { step: "asc" } },
      _count: { select: { logs: true } },
    },
  });

  return ok({ rules: rules.map(serializeRule) });
});

// ─── Yangi qoida yaratish ───
export const POST = route(async (req) => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const input = (await readJson(req, ruleSchema)) as RuleInput;

  const rule = await prisma.instagramRule.create({
    data: buildRuleData(acc.restaurant.id, input),
    include: {
      keywords: true,
      messages: { include: { buttons: { orderBy: { sortOrder: "asc" } } }, orderBy: { step: "asc" } },
    },
  });

  return ok({ rule: serializeRule(rule) }, 201);
});
