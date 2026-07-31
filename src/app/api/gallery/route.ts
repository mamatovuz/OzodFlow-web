import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const images = await prisma.galleryImage.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  return ok(images);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  if (!body?.image) return fail("Rasm yuklang", 422);
  const category = ["interior", "exterior", "team", "other"].includes(body?.category)
    ? body.category
    : "interior";

  const count = await prisma.galleryImage.count({ where: { restaurantId: restaurant.id } });
  const image = await prisma.galleryImage.create({
    data: {
      restaurantId: restaurant.id,
      image: body.image,
      caption: body.caption || null,
      category,
      sortOrder: count,
    },
  });
  return ok(image, 201);
}
