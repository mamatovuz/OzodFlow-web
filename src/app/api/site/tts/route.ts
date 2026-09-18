import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { publicPostWhere } from "@/lib/site";
import { edgeSynthesize, resolveEdgeVoice } from "@/lib/edge-tts";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // WebSocket (ws) uchun Node runtime shart
export const maxDuration = 30;

const schema = z.object({
  slug: z.string().min(1),
  text: z.string().min(1).max(2500),
  lang: z.enum(["uz", "ru", "en"]).default("uz"),
  voice: z.string().max(60).optional(),
});

// Matn→nutq (Microsoft Edge, BEPUL o'zbek neyron ovozi). WAV emas — MP3.
// Faqat ochiq maqola matni uchun + tez cheklov. Kalit shart emas.
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-tts", { limit: 150, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const { slug, text, lang, voice } = parsed.data;

  const post = await prisma.sitePost.findFirst({ where: { slug, ...publicPostWhere() }, select: { password: true } });
  if (!post) return fail("Maqola topilmadi", 404);
  if (post.password) return fail("Bu maqola qulflangan", 403);

  const v = resolveEdgeVoice(lang, voice);
  try {
    const mp3 = await edgeSynthesize(text, v);
    if (!mp3 || mp3.length < 100) return fail("Ovoz yaratilmadi", 502);
    return new Response(new Uint8Array(mp3), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "X-Voice-Id": v.id,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Ovoz xatosi", 502);
  }
}
