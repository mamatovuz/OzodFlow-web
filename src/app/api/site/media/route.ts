import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

// Yuklangan rasmlar kutubxonasi (qayta ishlatish uchun)
export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const media = await prisma.siteMedia.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return ok(media);
}
