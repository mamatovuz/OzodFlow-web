import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

// Domen so'rovini bajarish yoki rad etish
// Body: { action: "complete" | "reject", note?: string }
// complete -> restoranga customDomain o'rnatiladi
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("domains");
  if (!user) return res;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const note: string | undefined = body?.note;

  const request = await prisma.domainRequest.findUnique({ where: { id } });
  if (!request) return fail("So'rov topilmadi", 404);
  if (request.status !== "PENDING") {
    return fail("Bu so'rov allaqachon ko'rib chiqilgan", 409);
  }

  if (action === "complete") {
    // Domen band emasligini tekshirish
    const taken = await prisma.restaurant.findFirst({
      where: {
        customDomain: request.domain,
        NOT: { id: request.restaurantId },
      },
    });
    if (taken) return fail("Bu domen boshqa restoranga biriktirilgan", 409);

    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: request.restaurantId },
        data: { customDomain: request.domain },
      }),
      prisma.domainRequest.update({
        where: { id },
        data: { status: "DONE", adminNote: note || null, reviewedAt: new Date() },
      }),
    ]);
    return ok({ status: "DONE" });
  }

  if (action === "reject") {
    await prisma.domainRequest.update({
      where: { id },
      data: { status: "REJECTED", adminNote: note || null, reviewedAt: new Date() },
    });
    return ok({ status: "REJECTED" });
  }

  return fail("Noto'g'ri amal", 422);
}
