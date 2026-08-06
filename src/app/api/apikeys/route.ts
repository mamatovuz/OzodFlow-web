import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail, readJson, route } from "@/lib/api";
import { createApiKey } from "@/lib/api-key";

// ─── Restoran API kalitlari ro'yxati ───
export const GET = route(async () => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return fail("Ruxsat yo'q", 403);

  const keys = await prisma.apiKey.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    // hash HECH QACHON qaytarilmaydi
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return ok(keys);
});

// ─── Yangi kalit yaratish (to'liq kalit FAQAT shu javobda ko'rinadi) ───
const createSchema = z.object({ name: z.string().min(1).max(60) });

export const POST = route(async (req: Request) => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return fail("Ruxsat yo'q", 403);

  const { name } = await readJson(req, createSchema);
  const created = await createApiKey(restaurant.id, name);
  // key — faqat shu yerda! Foydalanuvchi saqlab qolishi kerak.
  return ok({ id: created.id, name, key: created.key, prefix: created.prefix }, 201);
});
