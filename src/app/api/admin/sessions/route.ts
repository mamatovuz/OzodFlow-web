import { prisma } from "@/lib/prisma";
import { superAdminGuard, ok } from "@/lib/api";
import { getCurrentSessionId } from "@/lib/auth";
import { parseUserAgent } from "@/lib/device";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Adminlarning faol seanslari (kim, qaysi qurilma, qayerdan) ───
// Faqat bosh admin ko'radi. Bosh admin + qo'shimcha adminlar seanslari.
export async function GET() {
  const { user, res } = await superAdminGuard();
  if (!user) return res;

  const currentId = await getCurrentSessionId();

  const sessions = await prisma.session.findMany({
    where: {
      expiresAt: { gt: new Date() },
      user: { role: "ADMIN" },
    },
    orderBy: { lastSeenAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, isSuperAdmin: true } },
    },
  });

  return ok(
    sessions.map((s) => {
      const d = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        current: s.id === currentId,
        userId: s.user.id,
        userName: s.user.name,
        userEmail: s.user.email,
        isSuperAdmin: s.user.isSuperAdmin,
        type: d.type,
        os: d.os,
        browser: d.browser,
        label: d.label,
        ip: s.ip || null,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
      };
    })
  );
}
