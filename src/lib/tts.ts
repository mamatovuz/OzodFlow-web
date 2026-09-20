// Umumiy TTS yordamchilari — TTS route ham, ovoz oldindan tayyorlash ham ishlatadi.
import { edgeSynthesizeTimed, resolveEdgeVoice } from "./edge-tts";
import type { WordTiming } from "./tts-timing";
import { openaiTts } from "./openai-tts";

/**
 * Matndan MP3 ovoz — Edge (bepul neyron) → OpenAI (kalit) tartibida.
 * Ikkalasi ham MP3 beradi (Gemini WAV — u alohida, route'da zaxira sifatida).
 * Datacenter'da (Railway) Edge 403 bo'lsa OpenAI ishlaydi.
 */
export async function ttsMp3(text: string, lang = "uz", voice?: string): Promise<Buffer | null> {
  return (await ttsTimedMp3(text, lang, voice))?.audio || null;
}

export async function ttsTimedMp3(text: string, lang = "uz", voice?: string): Promise<{ audio: Buffer; timings: WordTiming[] } | null> {
  // 1) Edge
  try {
    const v = resolveEdgeVoice(lang, voice);
    const result = await edgeSynthesizeTimed(text, v);
    if (result.audio.length > 200) return result;
  } catch {
    /* keyingisi */
  }
  // 2) OpenAI
  try {
    const mp3 = await openaiTts(text, lang, voice);
    if (mp3 && mp3.length > 200) return { audio: mp3, timings: [] };
  } catch {
    /* yo'q */
  }
  return null;
}

/**
 * Matnni ~maxLen belgili bo'laklarga bo'ladi (jumla chegaralarida).
 * Ovoz oldindan tayyorlashda OpenAI 4096 belgi cheklovi uchun.
 */
export function splitForTts(text: string, maxLen = 3500): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > maxLen) {
      if (cur.trim()) out.push(cur.trim());
      if (s.length > maxLen) {
        // juda uzun jumla — so'zlarga bo'lamiz
        let piece = "";
        for (const w of s.split(" ")) {
          if ((piece + " " + w).length > maxLen) {
            if (piece.trim()) out.push(piece.trim());
            piece = w;
          } else piece = piece ? `${piece} ${w}` : w;
        }
        cur = piece;
      } else cur = s;
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
