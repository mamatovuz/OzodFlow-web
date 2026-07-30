import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

async function checkOwn(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) return null;
  const restaurant = await guardRestaurant(userId, category.restaurantId);
  return restaurant ? category : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const category = await checkOwn(user.id, id);
  if (!category) return fail("Kategoriya topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const updated = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const category = await checkOwn(user.id, id);
  if (!category) return fail("Kategoriya topilmadi", 404);

  await prisma.category.delete({ where: { id } });
  return ok({ deleted: true });
}
