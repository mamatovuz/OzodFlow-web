import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { restaurantSchema } from "@/lib/validation";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  return ok(restaurant);
}

export async function PATCH(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = restaurantSchema.partial().safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: parsed.data,
  });
  return ok(updated);
}
