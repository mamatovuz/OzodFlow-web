// ─────────────────────────────────────────────
// OpenAI TTS — foydalanuvchining OpenAI kaliti orqali (agar qo'shilgan bo'lsa).
// Datacenter IP'lardan ham ishlaydi (Edge TTS Railway'da 403 bo'ladi), neyron
// ovoz o'zbek matnini tabiiy o'qiydi. MP3 qaytaradi.
// ─────────────────────────────────────────────
import { getOpenAiKey } from "./ai";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
// Til → mos ovoz (OpenAI ovozlari tilга bog'liq emas, lekin tanlab qo'yamiz)
const VOICE_BY_LANG: Record<string, string> = { uz: "alloy", ru: "onyx", en: "nova" };

/**
 * Matnni OpenAI TTS orqali MP3 ga o'giradi. Kalit yoki model mos bo'lmasa null.
 * `gpt-4o-mini-tts` eng tabiiy; kalit modeli boshqa bo'lsa ham TTS uchun shu
 * ishlatiladi (chat modeli TTS'ga yaramaydi).
 */
export async function openaiTts(text: string, lang = "uz", voice?: string): Promise<Buffer | null> {
  const cfg = await getOpenAiKey();
  if (!cfg) return null;

  const v = voice || VOICE_BY_LANG[lang] || "alloy";
  // TTS uchun maxsus modellar — chat modeli (gpt-4o va h.k.) TTS API'da ishlamaydi
  const models = ["gpt-4o-mini-tts", "tts-1"];

  for (const model of models) {
    try {
      const res = await fetch(OPENAI_TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({
          model,
          input: text,
          voice: v,
          response_format: "mp3",
          // O'zbek talaffuzini yaxshilash uchun yo'riqnoma (gpt-4o-mini-tts qo'llaydi)
          ...(model === "gpt-4o-mini-tts"
            ? { instructions: "Speak clearly and naturally in Uzbek (o'zbek tili), with a warm, human narration pace." }
            : {}),
        }),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 200) return buf;
      }
      // 400/404 — model mos emas, keyingisini sinaymiz; 401/429 — to'xtaymiz
      if (res.status === 401 || res.status === 403 || res.status === 429) return null;
    } catch {
      /* keyingi model */
    }
  }
  return null;
}
