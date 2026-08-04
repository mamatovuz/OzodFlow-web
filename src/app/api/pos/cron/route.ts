import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { syncMenu } from "@/lib/pos";

/**
 * Avtomatik menyu sinxronizatsiyasi.
 * Tashqi cron (Railway Cron / GitHub Actions) har ~5 daqiqada chaqiradi:
 *   GET /api/pos/cron   header: x-cron-secret: <CRON_SECRET>
 *
 * `autoSync` yoqilgan va oxirgi sync `syncIntervalMin` daqiqadan oshgan
 * integratsiyalarni topib sinxronlaydi.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return fail("Ruxsat yo'q", 401);
  }

  const now = Date.now();
  const integrations = await prisma.posIntegration.findMany({
    where: { isActive: true, autoSync: true },
    select: { id: true, syncIntervalMin: true, lastSyncAt: true },
  });

  const due = integrations.filter((i) => {
    if (!i.lastSyncAt) return true;
    return now - new Date(i.lastSyncAt).getTime() >= i.syncIntervalMin * 60_000;
  });

  const results = [];
  for (const i of due) {
    try {
      const r = await syncMenu(i.id);
      results.push({ id: i.id, ok: r.ok, synced: r.itemsSynced, failed: r.itemsFailed });
    } catch {
      results.push({ id: i.id, ok: false });
    }
  }

  return ok({ checked: integrations.length, synced: results.length, results });
}
