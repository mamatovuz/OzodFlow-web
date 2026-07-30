import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { PLANS, type PlanKey } from "@/lib/plans";

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
    // Pullik tariflar bir martalik — umrbod (planUntil = null)
    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: request.restaurantId },
        data: {
          plan,
          planUntil: PLANS[plan].oneTime ? null : undefined,
        },
      }),
      prisma.paymentRequest.update({
        where: { id },
        data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
      }),
    ]);
    return ok({ status: "APPROVED" });
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
