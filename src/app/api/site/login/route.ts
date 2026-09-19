import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import {
  SITE_ADMIN_EMAIL,
  SITE_ADMIN_PASSWORD,
  createSiteSession,
  bumpActivity,
} from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-login", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (email !== SITE_ADMIN_EMAIL.toLowerCase() || password !== SITE_ADMIN_PASSWORD) {
    return fail("Email yoki parol noto'g'ri", 401);
  }

  await createSiteSession();
  bumpActivity().catch(() => {}); // bugungi kunni "yashil" qilamiz
  return ok({ success: true });
}
