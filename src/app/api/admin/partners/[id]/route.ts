import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("partners");
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name;
  if (typeof body?.image === "string") data.image = body.image;
  if (typeof body?.url === "string") data.url = body.url.trim() || null;
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;

  const partner = await prisma.partner
    .update({ where: { id }, data })
    .catch(() => null);
  if (!partner) return fail("Hamkor topilmadi", 404);
  return ok(partner);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("partners");
  if (!user) return res;
  const { id } = await params;
  await prisma.partner.delete({ where: { id } }).catch(() => {});
  return ok({ deleted: true });
}
