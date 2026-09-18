import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Ommaviy — izohga "yoqdi" (brauzer localStorage bilan takrorlanmasligini ta'minlaydi).
// delta: +1 (yoqdi) yoki -1 (bekor).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = limitOrReject(req, "site-comment-like", { limit: 40, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const delta = body?.delta === -1 ? -1 : 1;

  const c = await prisma.siteComment.findUnique({ where: { id }, select: { likes: true, approved: true } });
  if (!c || !c.approved) return fail("Izoh topilmadi", 404);

  const likes = Math.max(0, c.likes + delta);
  await prisma.siteComment.update({ where: { id }, data: { likes } });
  return ok({ likes });
}
