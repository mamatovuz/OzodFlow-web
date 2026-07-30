import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

// Body: { ids: string[] } — yangi tartibda ID lar
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const ids: string[] = body?.ids;
  if (!Array.isArray(ids)) return fail("ids massiv bo'lishi kerak", 422);

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.category.updateMany({
        where: { id, restaurantId: restaurant.id },
        data: { sortOrder: index },
      })
    )
  );

  return ok({ reordered: true });
}
