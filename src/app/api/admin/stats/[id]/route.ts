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
  if (typeof body?.value === "string") data.value = body.value;
  if (typeof body?.label === "string") data.label = body.label;
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;

  const stat = await prisma.siteStat
    .update({ where: { id }, data })
    .catch(() => null);
  if (!stat) return fail("Ko'rsatkich topilmadi", 404);
  return ok(stat);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;
  await prisma.siteStat.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
