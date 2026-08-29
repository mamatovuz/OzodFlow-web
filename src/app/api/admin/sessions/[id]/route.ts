import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Admin seansini chiqarib tashlash (kick) ───
// Faqat bosh admin. Faqat admin foydalanuvchining seansi o'chiriladi.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { role: true } } },
  });
  if (!session || session.user.role !== "ADMIN") {
    return fail("Seans topilmadi", 404);
  }

  await prisma.session.delete({ where: { id } });
  return ok({ ended: true });
}
