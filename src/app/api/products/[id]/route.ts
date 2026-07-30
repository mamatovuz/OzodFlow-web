import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";
import { productSchema } from "@/lib/validation";

async function checkOwn(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;
  const restaurant = await guardRestaurant(userId, product.restaurantId);
  return restaurant ? product : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const product = await checkOwn(user.id, id);
  if (!product) return fail("Mahsulot topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const { images, ...rest } = parsed.data;
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      ...(images !== undefined
        ? { images: images ? JSON.stringify(images) : null }
        : {}),
    },
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

  const product = await checkOwn(user.id, id);
  if (!product) return fail("Mahsulot topilmadi", 404);

  await prisma.product.delete({ where: { id } });
  return ok({ deleted: true });
}
