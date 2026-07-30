import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.bankName === "string") data.bankName = body.bankName;
  if (typeof body?.cardNumber === "string") data.cardNumber = body.cardNumber;
  if (typeof body?.cardHolder === "string") data.cardHolder = body.cardHolder;
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;

  const card = await prisma.paymentCard
    .update({ where: { id }, data })
    .catch(() => null);
  if (!card) return fail("Karta topilmadi", 404);
  return ok(card);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;
  await prisma.paymentCard.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
