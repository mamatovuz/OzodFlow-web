import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { publicPostWhere } from "@/lib/site";
import { voicelabConfigured, ttsSpeak, resolveVoice } from "@/lib/voicelab";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  slug: z.string().min(1),
  text: z.string().min(1),
  lang: z.enum(["uz", "ru", "en"]).default("uz"),
  voice: z.string().regex(/^voice_[A-Za-z0-9_-]+$/).optional(),
});

// Matn→nutq (VoiceLab). Ommaviy, lekin faqat mavjud maqola matni uchun + tez
// cheklov. WAV (audio/wav) qaytaradi. Kalit serverda qoladi.
export async function POST(req: NextRequest) {
  if (!voicelabConfigured()) return fail("Ovozli o'qish sozlanmagan", 503);
  const limited = limitOrReject(req, "site-tts", { limit: 120, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const { slug, text, lang, voice } = parsed.data;

  // Faqat ochiq (qulflanmagan) maqola matnini o'qiymiz
  const post = await prisma.sitePost.findFirst({ where: { slug, ...publicPostWhere() }, select: { password: true } });
  if (!post) return fail("Maqola topilmadi", 404);
  if (post.password) return fail("Bu maqola qulflangan", 403);

  // Bir bo'lak = ≤1000 bayt (VoiceLab chegarasi)
  if (new TextEncoder().encode(text).length > 1000) return fail("Matn bo'lagi juda uzun", 422);

  const voiceId = await resolveVoice(lang, voice);
  const r = await ttsSpeak(text, lang, voiceId);
  if (!r.ok) {
    if (r.status === 429) return fail("Ovoz xizmati band, biroz kuting", 429);
    return fail("Ovoz yaratilmadi", 502);
  }

  return new Response(r.audio, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=3600",
      "X-Voice-Id": voiceId,
    },
  });
}
