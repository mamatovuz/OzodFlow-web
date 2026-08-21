import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { waiterSchema } from "@/lib/validation";

// Ofitsantni tahrirlash
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const { id } = await params;
  const waiter = await prisma.waiter.findFirst({
    where: { id, restaurantId: restaurant.id },
  });
  if (!waiter) return fail("Ofitsant topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = waiterSchema.partial().safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  // Kod o'zgarsa — band emasligini tekshiramiz
  if (data.code !== undefined) {
    const code = data.code.trim();
    const clash = await prisma.waiter.findFirst({
      where: { restaurantId: restaurant.id, code, NOT: { id } },
    });
    if (clash) return fail("Bu kod band — boshqasini tanlang", 409);
  }

  const updated = await prisma.waiter.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName?.trim() || null } : {}),
      ...(data.age !== undefined ? { age: data.age ?? null } : {}),
      ...(data.code !== undefined ? { code: data.code.trim() } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return ok(updated);
}

// Ofitsantni o'chirish
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const { id } = await params;
  const waiter = await prisma.waiter.findFirst({
    where: { id, restaurantId: restaurant.id },
  });
  if (!waiter) return fail("Ofitsant topilmadi", 404);

  await prisma.waiter.delete({ where: { id } });
  return ok({ id });
}
