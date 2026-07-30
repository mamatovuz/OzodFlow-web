import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const banners = await prisma.banner.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  return ok(banners);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  if (!body?.image && !body?.title) {
    return fail("Rasm yoki sarlavha kiriting", 422);
  }

  const count = await prisma.banner.count({ where: { restaurantId: restaurant.id } });
  const banner = await prisma.banner.create({
    data: {
      restaurantId: restaurant.id,
      image: body.image || null,
      title: body.title || null,
      subtitle: body.subtitle || null,
      linkUrl: body.linkUrl || null,
      sortOrder: count,
    },
  });
  return ok(banner, 201);
}
