import { prisma } from "@/lib/prisma";
import { route, ok, authGuard } from "@/lib/api";
import { getCurrentSessionId } from "@/lib/auth";
import { parseUserAgent } from "@/lib/device";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Foydalanuvchining faol seanslari (qurilmalari) + bloklangan qurilmalar ro'yxati.
export const GET = route(async () => {
  const { user, res } = await authGuard();
  if (res) return res;

  const currentId = await getCurrentSessionId();

  const [sessions, blocked] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user!.id, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.blockedDevice.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return ok({
    sessions: sessions.map((s) => {
      const d = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        current: s.id === currentId,
        type: d.type,
        os: d.os,
        browser: d.browser,
        label: d.label,
        ip: s.ip || null,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
      };
    }),
    blocked: blocked.map((b) => ({
      fingerprint: b.fingerprint,
      label: b.label,
      ip: b.ip || null,
      createdAt: b.createdAt,
    })),
  });
});
