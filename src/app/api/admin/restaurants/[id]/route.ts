import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

// Bosh admin: restoranni bloklash/blokdan chiqarish
// Body: { isBlocked: boolean, reason?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  if (typeof body?.isBlocked !== "boolean") return fail("isBlocked kerak", 422);

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      isBlocked: body.isBlocked,
      blockReason: body.isBlocked ? (body.reason || null) : null,
    },
  });
  return ok({ id: updated.id, isBlocked: updated.isBlocked });
}

// Bosh admin: restoranni butunlay o'chirish (barcha bog'liq ma'lumotlar bilan)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  // Restoran o'chiriladi (cascade bilan menyu, buyurtma va h.k. ham o'chadi)
  await prisma.restaurant.delete({ where: { id } });

  // Agar egada boshqa restoran qolmagan bo'lsa — foydalanuvchi hisobini ham o'chiramiz
  const owner = await prisma.user.findUnique({
    where: { id: restaurant.ownerId },
    select: { role: true, _count: { select: { restaurants: true } } },
  });
  if (owner && owner.role !== "ADMIN" && owner._count.restaurants === 0) {
    await prisma.user.delete({ where: { id: restaurant.ownerId } }).catch(() => {});
  }

  return ok({ deleted: true });
}
