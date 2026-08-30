import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Ariza holatini o'zgartirish ("Gaplashildi" tugmasi) yoki o'chirish
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id, sid } = await params;

  const body = await req.json().catch(() => null);
  const contacted = typeof body?.contacted === "boolean" ? body.contacted : true;

  const sub = await prisma.landingSubmission
    .update({
      where: { id: sid, pageId: id },
      data: { contacted, contactedAt: contacted ? new Date() : null },
    })
    .catch(() => null);
  if (!sub) return fail("Ariza topilmadi", 404);
  return ok(sub);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id, sid } = await params;
  await prisma.landingSubmission.delete({ where: { id: sid, pageId: id } }).catch(() => {});
  return ok({ deleted: true });
}
