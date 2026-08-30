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

  // ── Bir qurilmani bitta qilib ko'rsatish (dedup) ──
  // Bir noutbukdan bir necha marta kirilsa — deviceId (barmoq izi) bir xil bo'ladi.
  // Shu izga qarab guruhlab, faqat eng so'nggi seansni ko'rsatamiz (nechta ekanini
  // ham qaytaramiz). Iz yo'q eski seanslar o'z holicha qoladi.
  type Grp = { rep: (typeof sessions)[number]; count: number; current: boolean };
  const groups = new Map<string, Grp>();
  for (const s of sessions) {
    const key = s.deviceId || `id:${s.id}`;
    const cur = s.id === currentId;
    const g = groups.get(key);
    if (!g) {
      // Sessions lastSeenAt bo'yicha kamayish tartibida — birinchisi = eng so'nggi (rep)
      groups.set(key, { rep: s, count: 1, current: cur });
    } else {
      g.count += 1;
      g.current = g.current || cur;
    }
  }

  return ok({
    sessions: Array.from(groups.values()).map(({ rep: s, count, current }) => {
      const d = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        current,
        count,
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
