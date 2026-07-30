import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return ok(categories);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const count = await prisma.category.count({
    where: { restaurantId: restaurant.id },
  });

  const category = await prisma.category.create({
    data: {
      ...parsed.data,
      restaurantId: restaurant.id,
      sortOrder: count,
    },
  });

  return ok(category, 201);
}
