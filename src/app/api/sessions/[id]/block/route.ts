import { prisma } from "@/lib/prisma";
import { route, ok, fail, authGuard } from "@/lib/api";
import { getCurrentSessionId } from "@/lib/auth";
import { parseUserAgent } from "@/lib/device";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Qurilmani bloklash — o'sha qurilmaning barcha seanslari o'chiriladi va
// barmoq izi qora ro'yxatga qo'shiladi (o'sha qurilma qayta kira olmaydi).
export const POST = route(async (_req, ctx) => {
  const { user, res } = await authGuard();
  if (res) return res;

  const { id } = await ctx.params;
  const currentId = await getCurrentSessionId();
  if (id === currentId) {
    return fail("Joriy qurilmani bloklab bo'lmaydi", 400);
  }

  const session = await prisma.session.findFirst({ where: { id, userId: user!.id } });
  if (!session) return fail("Seans topilmadi", 404);
  if (!session.deviceId) {
    // Barmoq izi yo'q eski seans — shunchaki chiqaramiz
    await prisma.session.delete({ where: { id } });
    return ok({ blocked: false, removed: true });
  }

  const d = parseUserAgent(session.userAgent);

  await prisma.$transaction([
    // Qora ro'yxatga qo'shamiz (bor bo'lsa yangilaymiz)
    prisma.blockedDevice.upsert({
      where: { userId_fingerprint: { userId: user!.id, fingerprint: session.deviceId } },
      create: {
        userId: user!.id,
        fingerprint: session.deviceId,
        label: d.label,
        userAgent: session.userAgent,
        ip: session.ip,
      },
      update: { label: d.label, userAgent: session.userAgent, ip: session.ip },
    }),
    // O'sha qurilmaning barcha faol seanslarini o'chiramiz
    prisma.session.deleteMany({ where: { userId: user!.id, deviceId: session.deviceId } }),
  ]);

  return ok({ blocked: true, fingerprint: session.deviceId });
});
