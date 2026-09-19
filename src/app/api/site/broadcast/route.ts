import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, sendBroadcast, bumpActivity } from "@/lib/site";
import { emailConfigured } from "@/lib/email";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  subject: z.string().trim().max(160).optional().default(""),
  bodyHtml: z.string().trim().min(1, "Xabar matni bo'sh").max(20000),
  emails: z.array(z.string().email()).max(5000).optional(), // bo'sh — barchaga
});

// Admin ommaviy xabari — obunachilarga (yoki tanlangan emaillarga) yuboradi.
export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const limited = limitOrReject(req, "site-broadcast", { limit: 20, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  if (!emailConfigured()) return fail("Email sozlanmagan (RESEND_API_KEY yo'q)", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);

  const { subject, bodyHtml, emails } = parsed.data;
  const res = await sendBroadcast({ subject, bodyHtml, emails });
  bumpActivity().catch(() => {});
  return ok(res);
}
