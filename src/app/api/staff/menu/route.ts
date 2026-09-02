import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Ofitsant paneli uchun menyu — kategoriyalar + mahsulotlar (taom tanlash).
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: restaurant.id, isVisible: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, image: true },
    }),
    prisma.product.findMany({
      where: { restaurantId: restaurant.id, isVisible: true, isAvailable: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, price: true, categoryId: true, images: true },
    }),
  ]);

  return ok({ categories, products, currency: restaurant.currency });
}
