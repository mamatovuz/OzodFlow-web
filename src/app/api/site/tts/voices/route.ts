import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { voicelabConfigured, voicesForLang } from "@/lib/voicelab";

export const dynamic = "force-dynamic";

// Tanlangan til uchun mavjud ovozlar (o'quvchi tanlashi uchun).
export async function GET(req: NextRequest) {
  if (!voicelabConfigured()) return ok({ voices: [] });
  const lang = new URL(req.url).searchParams.get("lang") || "uz";
  const voices = await voicesForLang(lang);
  return ok({
    voices: voices.map((v) => ({ id: v.id, name: v.name, gender: v.gender, short: v.short })),
  });
}
