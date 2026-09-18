// ─────────────────────────────────────────────
// Gemini TTS — foydalanuvchining mavjud Gemini kaliti orqali (BEPUL kvota).
// Rasmiy API — bloklanmaydi. PCM (24kHz, 16-bit, mono) base64 qaytaradi;
// biz WAV sarlavhasi bilan o'rab audio/wav qilib beramiz.
// ─────────────────────────────────────────────
import { getGeminiKey } from "./ai";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// TTS modellari (birinchisi topilmasa keyingisi)
const TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];

// Gemini prebuilt ovozlari (tilga bog'liq emas — matn qaysi tilda bo'lsa shunday o'qiydi)
export const GEMINI_VOICES = [
  { id: "Charon", name: "Charon" },
  { id: "Kore", name: "Kore" },
  { id: "Puck", name: "Puck" },
  { id: "Aoede", name: "Aoede" },
  { id: "Fenrir", name: "Fenrir" },
  { id: "Leda", name: "Leda" },
];

function wavHeader(dataLen: number, rate = 24000, channels = 1, bits = 16): Buffer {
  const byteRate = (rate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const b = Buffer.alloc(44);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + dataLen, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(byteRate, 28);
  b.writeUInt16LE(blockAlign, 32);
  b.writeUInt16LE(bits, 34);
  b.write("data", 36);
  b.writeUInt32LE(dataLen, 40);
  return b;
}

/** Matnni Gemini TTS orqali WAV (24kHz) ga o'giradi. */
export async function geminiTts(text: string, voice = "Charon"): Promise<Buffer> {
  const key = await getGeminiKey();
  if (!key) throw new Error("Gemini kaliti yo'q");

  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });

  let lastErr = "";
  for (const model of TTS_MODELS) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "network";
      continue;
    }
    if (!res.ok) {
      lastErr = (await res.text().catch(() => "")).slice(0, 200);
      if (res.status === 404) continue; // model yo'q — keyingisini sinaymiz
      continue;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const b64 = part?.inlineData?.data;
    if (!b64) {
      lastErr = "audio kelmadi";
      continue;
    }
    const pcm = Buffer.from(b64, "base64");
    const rate = Number(/rate=(\d+)/.exec(part?.inlineData?.mimeType || "")?.[1] || 24000);
    return Buffer.concat([wavHeader(pcm.length, rate), pcm]);
  }
  throw new Error(`Gemini TTS: ${lastErr || "xato"}`);
}
