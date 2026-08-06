import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail, route } from "@/lib/api";

// ─── Kalitni o'chirish (bekor qilish) ───
export const DELETE = route(async (_req, ctx) => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return fail("Ruxsat yo'q", 403);

  const { id } = (await ctx.params) as { id: string };
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.restaurantId !== restaurant.id) return fail("Kalit topilmadi", 404);

  await prisma.apiKey.delete({ where: { id } });
  return ok({ deleted: true });
});
