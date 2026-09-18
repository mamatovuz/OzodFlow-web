// ─────────────────────────────────────────────
// VoiceLab.uz — o'zbekcha matn→nutq (TTS).
// API kaliti FAQAT serverda (VOICELAB_API_KEY env). Mijozga hech qachon
// yuborilmaydi — brauzer bizning route'ga so'rov yuboradi, route kalit bilan
// VoiceLab'ga murojaat qiladi.
//   POST https://api.voicelab.uz/v1/tts  →  audio/wav (24kHz, mono)
//   Matn chegarasi: 1000 UTF-8 bayt. Uzun matn bo'laklab yuboriladi.
// ─────────────────────────────────────────────
import crypto from "crypto";

const BASE = "https://api.voicelab.uz/v1";

export function voicelabConfigured(): boolean {
  return Boolean(process.env.VOICELAB_API_KEY);
}

function apiKey(): string {
  return process.env.VOICELAB_API_KEY || "";
}

export type Voice = { id: string; name: string; gender: string; language: string; short?: string };

// Ovozlar keshi (1 soat) — har so'rovda qayta yuklamaslik uchun
let voiceCache: { at: number; voices: Voice[] } | null = null;

export async function listVoices(): Promise<Voice[]> {
  if (voiceCache && Date.now() - voiceCache.at < 60 * 60 * 1000) return voiceCache.voices;
  try {
    const res = await fetch(`${BASE}/voices`, { headers: { Authorization: `Bearer ${apiKey()}` } });
    if (!res.ok) return voiceCache?.voices || [];
    const data = (await res.json()) as { data?: { id: string; display_name?: string; name?: string; gender?: string; language?: string; short_description?: string }[] };
    const voices: Voice[] = (data.data || []).map((v) => ({
      id: v.id,
      name: v.display_name || v.name || v.id,
      gender: v.gender || "",
      language: v.language || "",
      short: v.short_description || "",
    }));
    voiceCache = { at: Date.now(), voices };
    return voices;
  } catch {
    return voiceCache?.voices || [];
  }
}

/** Berilgan til uchun o'zbek/mos ovozlar. */
export async function voicesForLang(lang: string): Promise<Voice[]> {
  const all = await listVoices();
  return all.filter((v) => v.language === lang);
}

/**
 * Til uchun yaroqli voice_id ni tanlaydi:
 * - so'ralgan ovoz shu tilga tegishli bo'lsa — o'sha
 * - aks holda shu tildagi birinchi ovoz
 * - topilmasa — env default yoki uz Gulnoza
 */
export async function resolveVoice(lang: string, requested?: string | null): Promise<string> {
  const list = await voicesForLang(lang);
  if (requested && list.some((v) => v.id === requested)) return requested;
  if (list[0]) return list[0].id;
  return process.env.VOICELAB_DEFAULT_VOICE || "voice_01J9NEUTRAL0000000000000001";
}

export type TtsResult =
  | { ok: true; audio: ArrayBuffer; durationMs: number; chars: number }
  | { ok: false; status: number; error: string };

/** Bitta matn bo'lagini nutqqa o'giradi (≤1000 bayt). WAV (24kHz) qaytadi. */
export async function ttsSpeak(text: string, lang: string, voiceId: string, speed = 1): Promise<TtsResult> {
  if (!voicelabConfigured()) return { ok: false, status: 503, error: "VOICELAB_API_KEY sozlanmagan" };
  const idem = "tts" + crypto.createHash("sha256").update(`${lang}:${voiceId}:${speed}:${text}`).digest("hex").slice(0, 40);
  try {
    const res = await fetch(`${BASE}/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idem,
      },
      body: JSON.stringify({ text, language: lang, voice_id: voiceId, speed }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: t.slice(0, 200) || `HTTP ${res.status}` };
    }
    const audio = await res.arrayBuffer();
    return {
      ok: true,
      audio,
      durationMs: Number(res.headers.get("X-Voicelab-Audio-Duration-Ms") || 0),
      chars: Number(res.headers.get("X-Voicelab-Characters-Used") || text.length),
    };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "network" };
  }
}

/**
 * Matnni ≤maxBytes (UTF-8) bo'laklarga bo'ladi — jumla chegaralarini hurmat
 * qiladi. Uzun matn uzluksiz o'qilishi uchun ketma-ket yuboriladi.
 */
export function splitForTts(text: string, maxBytes = 900): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const enc = new TextEncoder();
  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean];
  const chunks: string[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = "";
  };
  for (const s of sentences) {
    if (enc.encode(cur + s).length > maxBytes) {
      push();
      // Jumlaning o'zi juda uzun bo'lsa — so'zlarga bo'lamiz
      if (enc.encode(s).length > maxBytes) {
        let piece = "";
        for (const w of s.split(" ")) {
          if (enc.encode(piece + " " + w).length > maxBytes) {
            if (piece.trim()) chunks.push(piece.trim());
            piece = w;
          } else piece = piece ? `${piece} ${w}` : w;
        }
        cur = piece;
      } else {
        cur = s;
      }
    } else {
      cur += s;
    }
  }
  push();
  return chunks;
}
