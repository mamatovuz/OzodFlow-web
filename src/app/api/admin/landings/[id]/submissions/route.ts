import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("landings");
  if (!user) return res;
  const { id } = await params;

  const page = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } });
  if (!page) return fail("Sahifa topilmadi", 404);

  const submissions = await prisma.landingSubmission.findMany({
    where: { pageId: id },
    orderBy: { createdAt: "desc" },
  });
  return ok(submissions);
}
