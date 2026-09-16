// ─────────────────────────────────────────────
// AI yordamchisi — menyu importi uchun (vision + rasm generatsiya).
//
// Bosh admin bir nechta AI kalit qo'shadi. Bu yerda ular FAILOVER tartibida
// ishlatiladi: birinchi kalit limitga yetsa (429/quota) — avtomatik keyingisiga
// o'tadi. Shu tarzda cheksiz zaxira: bir kalitning limiti tugasa boshqasi ishlaydi.
//
// Provayderlar: Google Gemini VA OpenAI. Kalit qo'shilganda provayder va model
// avtomatik aniqlanadi (kalit formati + provayder model ro'yxati orqali).
// API kaliti DB'da AES-256-GCM bilan shifrlanadi.
// ─────────────────────────────────────────────

import crypto from "crypto";
import { prisma } from "./prisma";
import type { AiKey } from "@prisma/client";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENAI_BASE = "https://api.openai.com/v1";

export type Provider = "gemini" | "openai";

// ─── Shifrlash (AI kalitlari uchun) ───
function aiKey(): Buffer {
  const raw = process.env.POS_ENCRYPTION_KEY;
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
    return crypto.createHash("sha256").update(raw).digest();
  }
  const fallback = process.env.JWT_SECRET || "ozodflow-dev-secret-change-me";
  return crypto.createHash("sha256").update(`ai:${fallback}`).digest();
}

export function encryptApiKey(value: string): string {
  const key = aiKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(value, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptApiKey(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("AI kalit formati noto'g'ri");
  const key = aiKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(parts[3], "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function keyHint(value: string): string {
  return value.length <= 4 ? "••••" : "••••" + value.slice(-4);
}

// Kalit formatidan provayderni taxmin qilamiz (aniq tekshiruv detectApiKey'da).
export function guessProvider(apiKey: string): Provider {
  const k = apiKey.trim();
  if (/^sk-/.test(k) || /^sess-/.test(k)) return "openai";
  if (/^AIza/.test(k)) return "gemini";
  // Noma'lum: Gemini kalitlari odatda 39 belgi, OpenAI kalitlari uzunroq/sk- bilan.
  return k.length > 60 ? "openai" : "gemini";
}

// AI umuman sozlanganmi (kamida bitta faol kalit)?
export async function aiConfigured(): Promise<boolean> {
  const n = await prisma.aiKey.count({ where: { isActive: true } });
  return n > 0;
}

// Ishlatishga tayyor kalitlar (faol, cooldown tugagan) — failover tartibida
async function usableKeys(): Promise<AiKey[]> {
  const now = new Date();
  const keys = await prisma.aiKey.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return keys.filter((k) => !k.cooldownUntil || k.cooldownUntil < now);
}

async function markSuccess(id: string) {
  await prisma.aiKey
    .update({ where: { id }, data: { lastUsedAt: new Date(), failCount: 0, lastError: null } })
    .catch(() => {});
}

async function markFailure(id: string, error: string, cooldownMs: number) {
  await prisma.aiKey
    .update({
      where: { id },
      data: {
        failCount: { increment: 1 },
        lastError: error.slice(0, 300),
        cooldownUntil: cooldownMs > 0 ? new Date(Date.now() + cooldownMs) : undefined,
      },
    })
    .catch(() => {});
}

// Limit/quota xatosimi? (shu kalitni vaqtincha chetlab, keyingisiga o'tamiz)
function isQuotaError(status: number, bodyText: string): boolean {
  if (status === 429) return true;
  if (status === 403 && /quota|permission|exhaust|billing/i.test(bodyText)) return true;
  if (status === 402) return true; // OpenAI: mablag' yetarli emas
  return false;
}

export type AiImage = { mime: string; base64: string };

// ─────────────────────────────────────────────
// GEMINI — past darajali
// ─────────────────────────────────────────────
type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } };
type GeminiResp = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string; status?: string };
};

async function geminiGenerate(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  opts?: { json?: boolean; image?: boolean }
): Promise<{ ok: true; data: GeminiResp } | { ok: false; status: number; body: string }> {
  const generationConfig: Record<string, unknown> = { temperature: opts?.image ? 0.9 : 0.2 };
  if (opts?.json) {
    generationConfig.responseMimeType = "application/json";
    // Uzun menyular kesilmasligi uchun katta chegara (aks holda taomlar tushib qoladi)
    generationConfig.maxOutputTokens = 8192;
  }
  if (opts?.image) generationConfig.responseModalities = ["IMAGE", "TEXT"];

  try {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text };
    const data = JSON.parse(text) as GeminiResp;
    if (data.error) return { ok: false, status: 400, body: data.error.message || "error" };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : "network" };
  }
}

function geminiExtractText(data: GeminiResp): string {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

function geminiExtractImage(data: GeminiResp): AiImage | null {
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline) {
      const mime = (inline as { mimeType?: string; mime_type?: string }).mimeType ||
        (inline as { mime_type?: string }).mime_type || "image/png";
      const b64 = (inline as { data?: string }).data;
      if (b64) return { mime, base64: b64 };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// OPENAI — past darajali
// ─────────────────────────────────────────────
type OpenAiContent = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

async function openaiChat(
  apiKey: string,
  model: string,
  content: OpenAiContent[],
  opts?: { json?: boolean }
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content }],
      temperature: 0.2,
    };
    if (opts?.json) {
      body.response_format = { type: "json_object" };
      body.max_tokens = 8192; // uzun menyu to'liq chiqsin
    }
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text };
    const data = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, text: (data.choices?.[0]?.message?.content || "").trim() };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : "network" };
  }
}

async function openaiImage(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ ok: true; image: AiImage | null } | { ok: false; status: number; body: string }> {
  try {
    const body: Record<string, unknown> = { model, prompt, size: "1024x1024", n: 1 };
    // dall-e modellari b64 uchun response_format talab qiladi; gpt-image-1 esa
    // bu parametrni qabul qilmaydi (doim b64_json qaytaradi).
    if (/dall-e/i.test(model)) body.response_format = "b64_json";
    const res = await fetch(`${OPENAI_BASE}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text };
    const data = JSON.parse(text) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    return { ok: true, image: b64 ? { mime: "image/png", base64: b64 } : null };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : "network" };
  }
}

export class AiUnavailableError extends Error {
  constructor(msg = "AI kalitlari sozlanmagan yoki barcha kalitlar band. Keyinroq urinib ko'ring.") {
    super(msg);
    this.name = "AiUnavailableError";
  }
}

function safeDecrypt(enc: string): string | null {
  try {
    return decryptApiKey(enc);
  } catch {
    return null;
  }
}

function providerOf(k: AiKey): Provider {
  return k.provider === "openai" ? "openai" : "gemini";
}

// ─────────────────────────────────────────────
// Yuqori daraja: matn/JSON (vision) — failover bilan
// ─────────────────────────────────────────────
export async function aiGenerateJson(
  promptText: string,
  images: AiImage[] = []
): Promise<string> {
  const keys = await usableKeys();
  if (keys.length === 0) throw new AiUnavailableError();

  let lastErr = "";
  for (const k of keys) {
    const apiKey = safeDecrypt(k.keyEnc);
    if (!apiKey) continue;

    if (providerOf(k) === "openai") {
      const content: OpenAiContent[] = [{ type: "text", text: promptText }];
      for (const img of images)
        content.push({ type: "image_url", image_url: { url: `data:${img.mime};base64,${img.base64}` } });
      const r = await openaiChat(apiKey, k.model, content, { json: true });
      if (r.ok) {
        await markSuccess(k.id);
        return r.text;
      }
      lastErr = r.body;
      await markFailure(k.id, r.body, isQuotaError(r.status, r.body) ? 2 * 60 * 1000 : 0);
      continue;
    }

    // gemini
    const parts: GeminiPart[] = [{ text: promptText }];
    for (const img of images) parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });
    const r = await geminiGenerate(apiKey, k.model, parts, { json: true });
    if (r.ok) {
      await markSuccess(k.id);
      return geminiExtractText(r.data);
    }
    lastErr = r.body;
    await markFailure(k.id, r.body, isQuotaError(r.status, r.body) ? 2 * 60 * 1000 : 0);
  }
  throw new AiUnavailableError(`AI javob bermadi: ${lastErr.slice(0, 120)}`);
}

// ─────────────────────────────────────────────
// Yuqori daraja: taom rasmini generatsiya qilish — failover bilan
// Muvaffaqiyatда AiImage, aks holda null (rasm ixtiyoriy).
// ─────────────────────────────────────────────
export async function aiGenerateDishImage(prompt: string): Promise<AiImage | null> {
  const keys = await usableKeys();
  if (keys.length === 0) return null;

  for (const k of keys) {
    const apiKey = safeDecrypt(k.keyEnc);
    if (!apiKey) continue;

    if (providerOf(k) === "openai") {
      const r = await openaiImage(apiKey, k.imageModel || "gpt-image-1", prompt);
      if (r.ok) {
        if (r.image) {
          await markSuccess(k.id);
          return r.image;
        }
        continue; // rasm qaytmadi — keyingi kalitni sinaymiz
      }
      if (isQuotaError(r.status, r.body)) {
        await markFailure(k.id, r.body, 2 * 60 * 1000);
        continue;
      }
      // boshqa xato (model yo'q, ruxsat yo'q) — keyingi kalitga o'tamiz
      continue;
    }

    // gemini
    const parts: GeminiPart[] = [{ text: prompt }];
    const r = await geminiGenerate(apiKey, k.imageModel || "gemini-2.5-flash-image-preview", parts, {
      image: true,
    });
    if (r.ok) {
      const img = geminiExtractImage(r.data);
      if (img) {
        await markSuccess(k.id);
        return img;
      }
      continue;
    }
    if (isQuotaError(r.status, r.body)) {
      await markFailure(k.id, r.body, 2 * 60 * 1000);
      continue;
    }
    continue;
  }
  return null;
}

// ─────────────────────────────────────────────
// Model ro'yxatini olib, eng mos matn/rasm modelini tanlash
// ─────────────────────────────────────────────
async function geminiListModels(apiKey: string): Promise<string[] | { error: string }> {
  try {
    const res = await fetch(`${GEMINI_BASE}?key=${apiKey}&pageSize=200`);
    const text = await res.text();
    if (!res.ok) {
      const msg = (() => {
        try {
          return (JSON.parse(text) as { error?: { message?: string } }).error?.message || text;
        } catch {
          return text;
        }
      })();
      return { error: msg.slice(0, 200) };
    }
    const data = JSON.parse(text) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    return (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "network" };
  }
}

async function openaiListModels(apiKey: string): Promise<string[] | { error: string }> {
  try {
    const res = await fetch(`${OPENAI_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = (() => {
        try {
          return (JSON.parse(text) as { error?: { message?: string } }).error?.message || text;
        } catch {
          return text;
        }
      })();
      return { error: msg.slice(0, 200) };
    }
    const data = JSON.parse(text) as { data?: { id?: string }[] };
    return (data.data || []).map((m) => m.id || "").filter(Boolean);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "network" };
  }
}

// Ro'yxatdan eng yaxshi matn/vision modelini tanlaymiz (tartib = ustuvorlik)
function pickTextModel(provider: Provider, models: string[]): string {
  const has = (needle: string) => models.find((m) => m.toLowerCase().includes(needle));
  if (provider === "gemini") {
    return (
      models.find((m) => m === "gemini-2.0-flash") ||
      has("2.5-flash") ||
      has("2.0-flash") ||
      has("flash") ||
      has("gemini") ||
      "gemini-2.0-flash"
    );
  }
  // openai — vision qo'llab-quvvatlaydigan arzon/tez modellar ustuvor
  return (
    models.find((m) => m === "gpt-4o-mini") ||
    models.find((m) => m === "gpt-4o") ||
    has("gpt-4.1-mini") ||
    has("gpt-4.1") ||
    has("gpt-4o") ||
    has("gpt-4") ||
    "gpt-4o-mini"
  );
}

function pickImageModel(provider: Provider, models: string[]): string {
  const has = (needle: string) => models.find((m) => m.toLowerCase().includes(needle));
  if (provider === "gemini") {
    return (
      has("flash-image") ||
      models.find((m) => m.toLowerCase().includes("image") && m.toLowerCase().includes("gemini")) ||
      "gemini-2.5-flash-image-preview"
    );
  }
  return has("gpt-image") || has("dall-e-3") || has("dall-e") || "gpt-image-1";
}

export type DetectResult = {
  ok: boolean;
  provider: Provider;
  model: string;
  imageModel: string;
  error?: string;
};

// Kalitni tekshirib, provayder + eng mos model + rasm modelini AVTOMATIK aniqlaydi.
export async function detectApiKey(apiKey: string): Promise<DetectResult> {
  const trimmed = apiKey.trim();
  const guessed = guessProvider(trimmed);
  // Taxmin qilingan provayderdan boshlab, kerak bo'lsa ikkinchisini ham sinaymiz.
  const order: Provider[] = guessed === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];

  let lastErr = "";
  for (const provider of order) {
    const models = provider === "gemini" ? await geminiListModels(trimmed) : await openaiListModels(trimmed);
    if (Array.isArray(models)) {
      if (models.length === 0) {
        lastErr = "Model ro'yxati bo'sh";
        continue;
      }
      return {
        ok: true,
        provider,
        model: pickTextModel(provider, models),
        imageModel: pickImageModel(provider, models),
      };
    }
    lastErr = models.error;
  }
  return {
    ok: false,
    provider: guessed,
    model: guessed === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash",
    imageModel: guessed === "openai" ? "gpt-image-1" : "gemini-2.5-flash-image-preview",
    error: lastErr || "Kalit tekshirilmadi",
  };
}

// Aniq kalit + provayder bilan bitta matn generatsiya (failover/DB'siz).
// Menyu AI'si uchun — restoran o'z kalitini ishlatadi. Xatoда null.
export async function aiTextWithKey(
  provider: Provider,
  apiKey: string,
  model: string,
  promptText: string,
  opts?: { json?: boolean }
): Promise<string | null> {
  if (provider === "openai") {
    const r = await openaiChat(apiKey, model, [{ type: "text", text: promptText }], { json: opts?.json });
    return r.ok ? r.text : null;
  }
  const r = await geminiGenerate(apiKey, model, [{ text: promptText }], { json: opts?.json });
  return r.ok ? geminiExtractText(r.data) : null;
}

// Bitta kalitni tez tekshirish (admin "test" tugmasi uchun) — provayderni aniqlab ko'radi.
export async function testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string; provider?: Provider; model?: string; imageModel?: string }> {
  const d = await detectApiKey(apiKey);
  if (d.ok) return { ok: true, provider: d.provider, model: d.model, imageModel: d.imageModel };
  return { ok: false, error: d.error };
}
