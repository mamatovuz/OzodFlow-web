import { NextRequest } from "next/server";
import { superAdminGuard, ok, fail } from "@/lib/api";
import { detectApiKey } from "@/lib/ai";

// Bosh admin: kalitni saqlashdan oldin provayder + modelni avtomatik aniqlash.
// Body: { apiKey }
export async function POST(req: NextRequest) {
  const { user, res } = await superAdminGuard();
  if (!user) return res;
  const body = await req.json().catch(() => null);
  const apiKey = String(body?.apiKey || "").trim();
  if (apiKey.length < 10) return fail("API kalit noto'g'ri", 422);

  const d = await detectApiKey(apiKey);
  if (!d.ok) return fail(d.error || "Kalit tekshirilmadi", 422);
  return ok({ provider: d.provider, model: d.model, imageModel: d.imageModel });
}
