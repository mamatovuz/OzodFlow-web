import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Egasi uchun izohlar ro'yxati + statistika
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const [reviews, agg, byRating] = await Promise.all([
    prisma.review.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.aggregate({
      where: { restaurantId: restaurant.id },
      _avg: { rating: true },
      _count: true,
    }),
    // Baho bo'yicha taqsimot (butun davr) — 5★..1★ ustunlari uchun
    prisma.review.groupBy({
      by: ["rating"],
      where: { restaurantId: restaurant.id },
      _count: { rating: true },
    }),
  ]);

  // {5: n, 4: n, 3: n, 2: n, 1: n}
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of byRating) {
    if (g.rating >= 1 && g.rating <= 5) distribution[g.rating] = g._count.rating;
  }

  return ok({
    reviews,
    total: agg._count,
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
    distribution,
  });
}
