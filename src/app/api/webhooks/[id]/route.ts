import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail, readJson, route } from "@/lib/api";

const EVENTS = ["order.created", "order.status"] as const;

async function ownHook(userId: string, id: string) {
  const restaurant = await getUserRestaurant(userId);
  if (!restaurant || restaurant.ownerId !== userId) return null;
  const hook = await prisma.webhook.findUnique({ where: { id } });
  if (!hook || hook.restaurantId !== restaurant.id) return null;
  return hook;
}

// ─── Webhookni tahrirlash (url / events / faollik) ───
const patchSchema = z.object({
  url: z.string().url().startsWith("https://").optional(),
  events: z.array(z.enum(EVENTS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = route(async (req, ctx) => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = (await ctx.params) as { id: string };
  const hook = await ownHook(user.id, id);
  if (!hook) return fail("Webhook topilmadi", 404);

  const data = await readJson(req, patchSchema);
  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.events !== undefined ? { events: JSON.stringify(data.events) } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return ok(updated);
});

// ─── Webhookni o'chirish ───
export const DELETE = route(async (_req, ctx) => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = (await ctx.params) as { id: string };
  const hook = await ownHook(user.id, id);
  if (!hook) return fail("Webhook topilmadi", 404);

  await prisma.webhook.delete({ where: { id } });
  return ok({ deleted: true });
});
