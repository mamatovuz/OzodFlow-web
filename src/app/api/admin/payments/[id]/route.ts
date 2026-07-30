import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { PLAN_DAYS, type PlanKey } from "@/lib/plans";

// To'lovni tasdiqlash yoki rad etish
// Body: { action: "approve" | "reject", note?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const note: string | undefined = body?.note;

  const request = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!request) return fail("So'rov topilmadi", 404);
  if (request.status !== "PENDING") {
    return fail("Bu so'rov allaqachon ko'rib chiqilgan", 409);
  }

  if (action === "approve") {
    const plan = request.plan as PlanKey;
    // Oylik obuna: faol bo'lsa uzaytiramiz, aks holda bugundan boshlaymiz
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      select: { planUntil: true, plan: true },
    });
    const now = new Date();
    const current = restaurant?.planUntil ? new Date(restaurant.planUntil) : null;
    const base =
      current && current > now && restaurant?.plan === plan ? current : now;
    const planUntil = new Date(base.getTime() + PLAN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: request.restaurantId },
        data: { plan, planUntil },
      }),
      prisma.paymentRequest.update({
        where: { id },
        data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
      }),
    ]);
    return ok({ status: "APPROVED", planUntil });
  }

  if (action === "reject") {
    await prisma.paymentRequest.update({
      where: { id },
      data: { status: "REJECTED", adminNote: note || null, reviewedAt: new Date() },
    });
    return ok({ status: "REJECTED" });
  }

  return fail("Noto'g'ri amal", 422);
}
