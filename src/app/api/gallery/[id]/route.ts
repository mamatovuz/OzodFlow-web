import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const item = await prisma.galleryImage.findUnique({ where: { id } });
  if (!item) return fail("Rasm topilmadi", 404);
  const r = await guardRestaurant(user.id, item.restaurantId);
  if (!r) return fail("Rasm topilmadi", 404);

  await prisma.galleryImage.delete({ where: { id } });
  return ok({ deleted: true });
}
