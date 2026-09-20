// ─────────────────────────────────────────────
// Microsoft Edge TTS — BEPUL, yuqori sifatli o'zbek neyron ovozlari
// (uz-UZ-MadinaNeural / uz-UZ-SardorNeural). Kalit shart emas.
//
// Edge brauzerining "read aloud" xizmatiga WebSocket orqali ulanadi.
// DRM: Sec-MS-GEC — vaqt (5 daqiqalik oyna) + ishonchli token SHA-256 hash'i.
// Server soati Microsoft bilan farq qilsa (masalan dev muhitida) — 403 javobdagi
// `Date` sarlavhasidan farqni hisoblab, bir marta qayta urinadi.
// ─────────────────────────────────────────────
import crypto from "crypto";
import WebSocket from "ws";
import type { WordTiming } from "./tts-timing";

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH = 11644473600;
const GEC_VERSION = "1-131.0.2903.112";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

// Til → (ovoz id, xml:lang). O'zbek uchun 2 ta neyron ovoz.
export type EdgeVoice = { id: string; name: string; gender: string; lang: string };
export const EDGE_VOICES: Record<string, EdgeVoice[]> = {
  uz: [
    { id: "uz-UZ-MadinaNeural", name: "Madina", gender: "female", lang: "uz-UZ" },
    { id: "uz-UZ-SardorNeural", name: "Sardor", gender: "male", lang: "uz-UZ" },
  ],
  ru: [
    { id: "ru-RU-SvetlanaNeural", name: "Svetlana", gender: "female", lang: "ru-RU" },
    { id: "ru-RU-DmitryNeural", name: "Dmitry", gender: "male", lang: "ru-RU" },
  ],
  en: [
    { id: "en-US-AriaNeural", name: "Aria", gender: "female", lang: "en-US" },
    { id: "en-US-GuyNeural", name: "Guy", gender: "male", lang: "en-US" },
  ],
};

export function voicesFor(lang: string): EdgeVoice[] {
  return EDGE_VOICES[lang] || EDGE_VOICES.uz;
}

export function resolveEdgeVoice(lang: string, requested?: string | null): EdgeVoice {
  const list = voicesFor(lang);
  return list.find((v) => v.id === requested) || list[0];
}

function secMsGec(skewSec = 0): string {
  let sec = Math.floor(Date.now() / 1000) + WIN_EPOCH + skewSec;
  sec -= sec % 300;
  const ticks = BigInt(sec) * 10000000n;
  return crypto.createHash("sha256").update(`${ticks.toString()}${TRUSTED_TOKEN}`).digest("hex").toUpperCase();
}

function wsUrl(skewSec: number): string {
  const connId = crypto.randomUUID().replace(/-/g, "");
  return (
    "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
    `?TrustedClientToken=${TRUSTED_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec(skewSec)}` +
    `&Sec-MS-GEC-Version=${GEC_VERSION}` +
    `&ConnectionId=${connId}`
  );
}

const WS_HEADERS = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpahbmplkmndnadgjabkhmhaj",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": UA,
};

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function ssml(text: string, voice: EdgeVoice, rate: string): string {
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.lang}'>` +
    `<voice name='${voice.id}'><prosody pitch='+0Hz' rate='${rate}' volume='+0%'>${escXml(text)}</prosody></voice></speak>`
  );
}

// Bitta ulanish urinishi. 403 bo'lsa — server `Date` sarlavhasidan vaqt farqini qaytaradi.
function open(skewSec: number): Promise<{ ws?: WebSocket; skew?: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(skewSec), { headers: WS_HEADERS, handshakeTimeout: 8000 });
    let settled = false;
    ws.once("open", () => {
      settled = true;
      resolve({ ws });
    });
    ws.once("unexpected-response", (_req, res) => {
      if (settled) return;
      settled = true;
      const date = res.headers?.date;
      if (res.statusCode === 403 && date) {
        const serverSec = Math.floor(Date.parse(date) / 1000);
        const localSec = Math.floor(Date.now() / 1000);
        resolve({ skew: serverSec - localSec });
      } else {
        reject(new Error(`Edge TTS HTTP ${res.statusCode}`));
      }
      try {
        ws.close();
      } catch {}
    });
    ws.once("error", (e) => {
      if (!settled) reject(e);
    });
  });
}

/**
 * Matnni Edge TTS orqali MP3 (24kHz) ga o'giradi. 403 (vaqt farqi) bo'lsa
 * server vaqtiga moslashib bir marta qayta urinadi.
 */
export async function edgeSynthesize(text: string, voice: EdgeVoice, rate = "+0%"): Promise<Buffer> {
  return (await edgeSynthesizeTimed(text, voice, rate)).audio;
}

export async function edgeSynthesizeTimed(text: string, voice: EdgeVoice, rate = "+0%"): Promise<{ audio: Buffer; timings: WordTiming[] }> {
  let r = await open(0);
  if (!r.ws && typeof r.skew === "number") {
    // Vaqt farqiga moslashib qayta urinamiz
    r = await open(r.skew);
  }
  const ws = r.ws;
  if (!ws) throw new Error("Edge TTS ulanmadi (403)");

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timings: WordTiming[] = [];
    let completed = false;
    const date = new Date().toString();
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error("Edge TTS vaqt tugadi"));
    }, 25000);

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const headerLen = (data[0] << 8) | data[1];
        const header = data.slice(2, 2 + headerLen).toString();
        if (header.includes("Path:audio")) chunks.push(data.slice(2 + headerLen));
      } else {
        const s = data.toString();
        if (s.includes("Path:audio.metadata")) {
          try {
            const payload = JSON.parse(s.slice(s.indexOf("\r\n\r\n") + 4));
            for (const item of payload.Metadata || []) {
              if (item.Type !== "WordBoundary") continue;
              const info = item.Data;
              const text = String(info.text.Text).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
              timings.push({ time: info.Offset / 10000000, duration: info.Duration / 10000000, text });
            }
          } catch { /* Audio remains usable if metadata is unavailable. */ }
        }
        if (s.includes("Path:turn.end")) {
          completed = true;
          clearTimeout(timer);
          try {
            ws.close();
          } catch {}
          resolve({ audio: Buffer.concat(chunks), timings });
        }
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    ws.on("close", () => {
      if (!completed) {
        clearTimeout(timer);
        reject(new Error("Edge TTS audio kelmadi"));
      }
    });

    // 1) Audio format konfiguratsiyasi
    ws.send(
      `X-Timestamp:${date}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
    );
    // 2) SSML matn
    const reqId = crypto.randomUUID().replace(/-/g, "");
    ws.send(
      `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${date}Z\r\nPath:ssml\r\n\r\n${ssml(text, voice, rate)}`
    );
  });
}
