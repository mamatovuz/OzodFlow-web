import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";
import { hashPin } from "@/lib/approvals";

// PATCH — egasi manager xodimning tasdiqlash PIN'ini o'rnatadi/o'chiradi
const patchSchema = z.object({
  pin: z.union([z.string().regex(/^\d{4}$/, "PIN 4 raqam bo'lishi kerak"), z.null()]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const membership = await prisma.membership.findUnique({
    where: { id },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!membership || membership.restaurant.ownerId !== user.id) {
    return fail("Xodim topilmadi", 404);
  }
  if (membership.role !== "MANAGER") {
    return fail("PIN faqat manager uchun o'rnatiladi", 422);
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("PIN 4 raqam bo'lishi kerak", 422);

  const pin = parsed.data.pin ? await hashPin(parsed.data.pin) : null;
  await prisma.membership.update({ where: { id }, data: { pin } });
  return ok({ hasPin: pin !== null });
}

// id = membership id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const membership = await prisma.membership.findUnique({
    where: { id },
    include: { restaurant: { select: { ownerId: true } } },
  });
  if (!membership || membership.restaurant.ownerId !== user.id) {
    return fail("Xodim topilmadi", 404);
  }

  // Xodim foydalanuvchisini ham o'chiramiz (membership cascade bilan ketadi)
  await prisma.user.delete({ where: { id: membership.userId } }).catch(async () => {
    await prisma.membership.delete({ where: { id } });
  });
  return ok({ deleted: true });
}
