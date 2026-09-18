import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { voicesFor } from "@/lib/edge-tts";

export const dynamic = "force-dynamic";

// Tanlangan til uchun mavjud ovozlar (o'quvchi tanlashi uchun). Edge — kalitsiz.
export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get("lang") || "uz";
  const voices = voicesFor(lang).map((v) => ({ id: v.id, name: v.name, gender: v.gender }));
  return ok({ voices });
}
