import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, guardRestaurant, getMembership, ok, fail } from "@/lib/api";

// Chaqiruvni yopish (ofitsiant "Borayapman" / "Hisob berildi")
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const { id } = await params;

  const call = await prisma.serviceCall.findUnique({ where: { id } });
  if (!call) return fail("Topilmadi", 404);

  // Owner yoki shu restoran xodimi
  const owns = await guardRestaurant(user.id, call.restaurantId);
  if (!owns) {
    const m = await getMembership(user.id);
    if (m?.restaurant.id !== call.restaurantId) return fail("Ruxsat yo'q", 403);
  }

  const updated = await prisma.serviceCall.update({
    where: { id },
    data: { status: "DONE", resolvedAt: new Date() },
  });
  return ok(updated);
}
