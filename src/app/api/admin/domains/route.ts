import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const status = req.nextUrl.searchParams.get("status");

  const requests = await prisma.domainRequest.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      restaurant: { select: { name: true, slug: true, plan: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  return ok(requests);
}
