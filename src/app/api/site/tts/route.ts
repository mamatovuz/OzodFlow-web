import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { publicPostWhere } from "@/lib/site";
import { geminiTts } from "@/lib/gemini-tts";
import { ttsTimedMp3 } from "@/lib/tts";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // WebSocket (ws) uchun Node runtime shart
export const maxDuration = 30;

const schema = z.object({
  slug: z.string().min(1),
  text: z.string().min(1).max(2500),
  lang: z.enum(["uz", "ru", "en"]).default("uz"),
  voice: z.string().max(60).optional(),
  timings: z.boolean().optional(),
});

// Matn→nutq. Zanjir: avval Microsoft Edge (BEPUL, a'lo o'zbek neyron ovozi);
// ishlamasa (blok/xato) — Gemini TTS (foydalanuvchi kaliti, bepul kvota).
// Shu tarzda deyarli har doim ovoz chiqadi, "ovoz xatosi" kamayadi.
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

  // 1) Edge (bepul neyron) → 2) OpenAI (kalit) — ikkalasi MP3
  try {
    const result = await ttsTimedMp3(text, lang, voice);
    if (result && result.audio.length > 200) {
      const mp3 = result.audio;
      if (parsed.data.timings) return Response.json({ audio: mp3.toString("base64"), mime: "audio/mpeg", timings: result.timings }, { headers: { "Cache-Control": "private, no-store" } });
      return new Response(new Uint8Array(mp3), {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Tts": "mp3" },
      });
    }
  } catch {
    // Gemini'ga o'tamiz
  }

  // 3) Gemini TTS (foydalanuvchi kaliti — bepul kvota)
  try {
    const wav = await geminiTts(text);
    if (wav && wav.length > 200) {
      if (parsed.data.timings) return Response.json({ audio: wav.toString("base64"), mime: "audio/wav", timings: [] }, { headers: { "Cache-Control": "private, no-store" } });
      return new Response(new Uint8Array(wav), {
        headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400", "X-Tts": "gemini" },
      });
    }
  } catch {
    /* hech biri ishlamadi — mijoz brauzer ovozini ishlatadi */
  }

  return fail("Ovoz hozir mavjud emas", 502);
}
