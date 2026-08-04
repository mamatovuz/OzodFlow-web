import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { runDuePosSyncs } from "@/lib/pos";

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

  const result = await runDuePosSyncs();
  return ok(result);
}
