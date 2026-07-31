import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";

async function checkOwn(userId: string, comboId: string) {
  const combo = await prisma.combo.findUnique({ where: { id: comboId } });
  if (!combo) return null;
  const r = await guardRestaurant(userId, combo.restaurantId);
  return r ? combo : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const combo = await checkOwn(user.id, id);
  if (!combo) return fail("Combo topilmadi", 404);

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  const updated = await prisma.combo.update({ where: { id }, data });
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const combo = await checkOwn(user.id, id);
  if (!combo) return fail("Combo topilmadi", 404);
  await prisma.combo.delete({ where: { id } });
  return ok({ deleted: true });
}
