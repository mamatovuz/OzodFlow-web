import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { publicPostWhere } from "@/lib/site";
import { edgeSynthesize, resolveEdgeVoice } from "@/lib/edge-tts";
import { geminiTts } from "@/lib/gemini-tts";
import { openaiTts } from "@/lib/openai-tts";
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

  // 1) Edge (a'lo sifatli, BEPUL o'zbek neyron ovozi) — ba'zi serverlarda
  //    (Railway kabi datacenter IP) Microsoft 403 qaytarishi mumkin.
  try {
    const v = resolveEdgeVoice(lang, voice);
    const mp3 = await edgeSynthesize(text, v);
    if (mp3 && mp3.length > 200) {
      return new Response(new Uint8Array(mp3), {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Tts": "edge" },
      });
    }
  } catch {
    // Edge bloklangan/xato — neyron kalitli variantlarga o'tamiz
  }

  // 2) OpenAI TTS (foydalanuvchi kaliti) — datacenter'dan ham ishlaydi, tabiiy ovoz
  try {
    const mp3 = await openaiTts(text, lang, voice);
    if (mp3 && mp3.length > 200) {
      return new Response(new Uint8Array(mp3), {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Tts": "openai" },
      });
    }
  } catch {
    // OpenAI kaliti yo'q/xato — Gemini'ga o'tamiz
  }

  // 3) Gemini TTS (foydalanuvchi kaliti — bepul kvota)
  try {
    const wav = await geminiTts(text);
    if (wav && wav.length > 200) {
      return new Response(new Uint8Array(wav), {
        headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400", "X-Tts": "gemini" },
      });
    }
  } catch {
    /* hech biri ishlamadi — mijoz brauzer ovozini ishlatadi */
  }

  return fail("Ovoz hozir mavjud emas", 502);
}
