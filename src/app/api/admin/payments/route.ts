import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok } from "@/lib/api";

// To'lov so'rovlari ro'yxati (status bo'yicha filtr)
export async function GET(req: NextRequest) {
  const { user, res } = await adminGuard("payments");
  if (!user) return res;

  const status = req.nextUrl.searchParams.get("status"); // PENDING | APPROVED | REJECTED

  const requests = await prisma.paymentRequest.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      restaurant: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  return ok(requests);
}
