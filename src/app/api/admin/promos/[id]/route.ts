import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("promos");
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (Number.isFinite(Number(body?.discountPercent)))
    data.discountPercent = Number(body.discountPercent);

  const promo = await prisma.promoCode
    .update({ where: { id }, data })
    .catch(() => null);
  if (!promo) return fail("Kod topilmadi", 404);
  return ok(promo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("promos");
  if (!user) return res;
  const { id } = await params;
  await prisma.promoCode.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
