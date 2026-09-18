import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const subscribers = await prisma.siteSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  return ok(subscribers);
}
