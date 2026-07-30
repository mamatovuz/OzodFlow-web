import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";

async function checkOwn(userId: string, bannerId: string) {
  const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
  if (!banner) return null;
  const r = await guardRestaurant(userId, banner.restaurantId);
  return r ? banner : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const banner = await checkOwn(user.id, id);
  if (!banner) return fail("Banner topilmadi", 404);

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  for (const k of ["image", "title", "subtitle", "linkUrl"]) {
    if (k in (body || {})) data[k] = body[k] || null;
  }
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.banner.update({ where: { id }, data });
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const banner = await checkOwn(user.id, id);
  if (!banner) return fail("Banner topilmadi", 404);

  await prisma.banner.delete({ where: { id } });
  return ok({ deleted: true });
}
