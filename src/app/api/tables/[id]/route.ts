import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, ok, fail } from "@/lib/api";

async function checkOwn(userId: string, tableId: string) {
  const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
  if (!table) return null;
  const r = await guardRestaurant(userId, table.restaurantId);
  return r ? table : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const table = await checkOwn(user.id, id);
  if (!table) return fail("Stol topilmadi", 404);

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  if (!name) return fail("Nom kiriting", 422);

  const updated = await prisma.restaurantTable.update({
    where: { id },
    data: { name },
  });
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;
  const table = await checkOwn(user.id, id);
  if (!table) return fail("Stol topilmadi", 404);

  await prisma.restaurantTable.delete({ where: { id } });
  return ok({ deleted: true });
}
