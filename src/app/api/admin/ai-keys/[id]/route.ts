import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok, fail } from "@/lib/api";

// Bosh admin: bitta AI kalitni tahrirlash yoki o'chirish.
// PATCH body: { isActive?, name?, model?, imageModel?, sortOrder?, resetCooldown? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.model === "string" && body.model.trim()) data.model = body.model.trim();
  if (typeof body?.imageModel === "string" && body.imageModel.trim())
    data.imageModel = body.imageModel.trim();
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (body?.resetCooldown) {
    data.cooldownUntil = null;
    data.failCount = 0;
    data.lastError = null;
  }

  if (Object.keys(data).length === 0) return fail("O'zgartirish yo'q", 422);

  const key = await prisma.aiKey.update({ where: { id }, data }).catch(() => null);
  if (!key) return fail("Kalit topilmadi", 404);
  return ok({ id: key.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const { id } = await params;
  await prisma.aiKey.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
