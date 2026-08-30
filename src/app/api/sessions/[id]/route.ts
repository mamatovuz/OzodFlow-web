import { prisma } from "@/lib/prisma";
import { route, ok, fail, authGuard } from "@/lib/api";
import { getCurrentSessionId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Seansni chiqarish (logout) — o'sha qurilma tizimdan chiqadi, lekin qayta kira oladi.
export const DELETE = route(async (_req, ctx) => {
  const { user, res } = await authGuard();
  if (res) return res;

  const { id } = await ctx.params;
  const currentId = await getCurrentSessionId();
  if (id === currentId) {
    return fail("Joriy qurilmani bu yerdan chiqarib bo'lmaydi (Chiqish tugmasini ishlating)", 400);
  }

  const session = await prisma.session.findFirst({ where: { id, userId: user!.id } });
  if (!session) return fail("Seans topilmadi", 404);

  // Bir qurilma bitta qatorda ko'rsatiladi (dedup) — chiqarganda shu qurilmaning
  // barcha seanslarini o'chiramiz (bittasi qolib ketmasin). Iz yo'q bo'lsa — faqat shu.
  if (session.deviceId) {
    const r = await prisma.session.deleteMany({
      where: { userId: user!.id, deviceId: session.deviceId },
    });
    return ok({ removed: true, count: r.count });
  }
  await prisma.session.delete({ where: { id } });
  return ok({ removed: true, count: 1 });
});
