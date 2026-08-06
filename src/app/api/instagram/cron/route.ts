import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { runIgMaintenance } from "@/lib/instagram/maintenance";

/**
 * Instagram fon xizmati: token yangilash + profil sinxroni.
 * Tashqi cron (yoki start.mjs) chaqiradi:
 *   GET /api/instagram/cron   header: x-cron-secret: <CRON_SECRET>
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return fail("Ruxsat yo'q", 401);
  }
  const result = await runIgMaintenance();
  return ok(result);
}
