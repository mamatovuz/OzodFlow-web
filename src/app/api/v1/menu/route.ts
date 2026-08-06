import { prisma } from "@/lib/prisma";
import { ok, fail, route } from "@/lib/api";
import { verifyApiKey, extractApiKey } from "@/lib/api-key";

export const dynamic = "force-dynamic";

/**
 * Hamkor (tashqi) API — v1.
 * Autentifikatsiya: `Authorization: Bearer ozf_live_...` yoki `X-Api-Key`.
 * Restoranning to'liq menyusini (kategoriya + mahsulot) JSON'da qaytaradi.
 *
 *   GET /api/v1/menu
 */
export const GET = route(async (req: Request) => {
  const auth = await verifyApiKey(extractApiKey(req));
  if (!auth) return fail("API kalit yaroqsiz yoki yo'q", 401);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: auth.restaurantId },
    select: {
      id: true,
      slug: true,
      name: true,
      currency: true,
      isActive: true,
      isBlocked: true,
    },
  });
  if (!restaurant || !restaurant.isActive || restaurant.isBlocked) {
    return fail("Restoran mavjud emas", 404);
  }

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: restaurant.id, isVisible: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, nameRu: true, nameEn: true, sortOrder: true },
    }),
    prisma.product.findMany({
      where: { restaurantId: restaurant.id, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        price: true,
        oldPrice: true,
        images: true,
        weight: true,
        calories: true,
        isAvailable: true,
      },
    }),
  ]);

  const res = ok({
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      currency: restaurant.currency,
    },
    categories,
    products: products.map((p) => ({
      ...p,
      images: p.images ? safeJson(p.images) : [],
    })),
  });
  // Hamkor tomonda keshlash uchun
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res;
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
