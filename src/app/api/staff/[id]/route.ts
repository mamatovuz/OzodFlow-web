import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";

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
