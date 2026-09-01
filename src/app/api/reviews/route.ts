import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Egasi uchun izohlar ro'yxati + statistika
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const [reviews, agg] = await Promise.all([
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
  ]);

  return ok({
    reviews,
    total: agg._count,
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
  });
}
