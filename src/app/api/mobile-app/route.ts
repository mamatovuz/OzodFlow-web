import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, fail, authGuard, readJson, getUserRestaurant } from "@/lib/api";
import { getOrCreateMobileApp } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mobil ilova sozlamasini oladi (yo'q bo'lsa default bilan yaratadi).
export const GET = route(async () => {
  const { user, res } = await authGuard();
  if (res) return res;

  const restaurant = await getUserRestaurant(user!.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const app = await getOrCreateMobileApp(restaurant);

  return ok({
    app,
    restaurant: {
      slug: restaurant.slug,
      name: restaurant.name,
      logo: restaurant.logo,
      primaryColor: restaurant.primaryColor,
    },
  });
});

const patchSchema = z.object({
  appName: z.string().trim().min(1).max(30).optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  splashText: z.string().trim().max(60).nullable().optional(),
});

// Sozlamani yangilaydi (nom/rang/matn o'zgarsa yangi build kerak bo'ladi).
export const PATCH = route(async (req) => {
  const { user, res } = await authGuard();
  if (res) return res;

  const restaurant = await getUserRestaurant(user!.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const data = await readJson(req, patchSchema);
  await getOrCreateMobileApp(restaurant); // mavjudligiga kafolat

  const app = await prisma.mobileApp.update({
    where: { restaurantId: restaurant.id },
    data: {
      ...(data.appName !== undefined ? { appName: data.appName } : {}),
      ...(data.themeColor !== undefined ? { themeColor: data.themeColor } : {}),
      ...(data.splashText !== undefined ? { splashText: data.splashText } : {}),
    },
  });

  return ok({ app });
});
