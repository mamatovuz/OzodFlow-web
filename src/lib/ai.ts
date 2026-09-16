// ─────────────────────────────────────────────
// AI yordamchisi — menyu importi uchun (vision + rasm generatsiya).
//
// Bosh admin bir nechta AI kalit qo'shadi. Bu yerda ular FAILOVER tartibida
// ishlatiladi: birinchi kalit limitga yetsa (429/quota) — avtomatik keyingisiga
// o'tadi. Shu tarzda cheksiz zaxira: bir kalitning limiti tugasa boshqasi ishlaydi.
//
// Provayder: Google Gemini (bepul tarif keng, vision + rasm generatsiya bor).
// API kaliti DB'da AES-256-GCM bilan shifrlanadi.
// ─────────────────────────────────────────────

import crypto from "crypto";
import { prisma } from "./prisma";
import type { AiKey } from "@prisma/client";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
  return false;
}

export type AiImage = { mime: string; base64: string };

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } };
type GeminiResp = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string; status?: string };
};

// ─── Past darajali: bitta kalit bilan Gemini generateContent ───
async function geminiGenerate(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  opts?: { json?: boolean; image?: boolean }
): Promise<{ ok: true; data: GeminiResp } | { ok: false; status: number; body: string }> {
  const generationConfig: Record<string, unknown> = { temperature: opts?.image ? 0.9 : 0.3 };
  if (opts?.json) generationConfig.responseMimeType = "application/json";
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

function extractText(data: GeminiResp): string {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

function extractImage(data: GeminiResp): AiImage | null {
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

export class AiUnavailableError extends Error {
  constructor(msg = "AI kalitlari sozlanmagan yoki barcha kalitlar band. Keyinroq urinib ko'ring.") {
    super(msg);
    this.name = "AiUnavailableError";
  }
}

// ─── Yuqori daraja: matn/JSON (vision) — failover bilan ───
export async function aiGenerateJson(
  promptText: string,
  images: AiImage[] = []
): Promise<string> {
  const keys = await usableKeys();
  if (keys.length === 0) throw new AiUnavailableError();

  const parts: GeminiPart[] = [{ text: promptText }];
  for (const img of images) parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });

  let lastErr = "";
  for (const k of keys) {
    const apiKey = safeDecrypt(k.keyEnc);
    if (!apiKey) continue;
    const r = await geminiGenerate(apiKey, k.model, parts, { json: true });
    if (r.ok) {
      await markSuccess(k.id);
      return extractText(r.data);
    }
    lastErr = r.body;
    // Limit/quota — bu kalitni 2 daqiqa chetlab, keyingisiga o'tamiz
    await markFailure(k.id, r.body, isQuotaError(r.status, r.body) ? 2 * 60 * 1000 : 0);
  }
  throw new AiUnavailableError(`AI javob bermadi: ${lastErr.slice(0, 120)}`);
}

// ─── Yuqori daraja: taom rasmini generatsiya qilish — failover bilan ───
// Muvaffaqiyatда AiImage, aks holda null (rasm ixtiyoriy, xato bo'lsa o'tkazamiz).
export async function aiGenerateDishImage(prompt: string): Promise<AiImage | null> {
  const keys = await usableKeys();
  if (keys.length === 0) return null;
  const parts: GeminiPart[] = [{ text: prompt }];
  for (const k of keys) {
    const apiKey = safeDecrypt(k.keyEnc);
    if (!apiKey) continue;
    const r = await geminiGenerate(apiKey, k.imageModel || "gemini-2.5-flash-image-preview", parts, {
      image: true,
    });
    if (r.ok) {
      const img = extractImage(r.data);
      if (img) {
        await markSuccess(k.id);
        return img;
      }
      // rasm qaytmadi — keyingi kalitni sinamaymiz (model qo'llab-quvvatlamasligi mumkin)
      continue;
    }
    if (isQuotaError(r.status, r.body)) {
      await markFailure(k.id, r.body, 2 * 60 * 1000);
      continue; // keyingi kalitga o'tamiz
    }
    // boshqa xato (model mavjud emas va h.k.) — rasmni tashlab ketamiz
    return null;
  }
  return null;
}

function safeDecrypt(enc: string): string | null {
  try {
    return decryptApiKey(enc);
  } catch {
    return null;
  }
}

// Bitta kalitni tez tekshirish (admin "test" tugmasi uchun)
export async function testApiKey(apiKey: string, model = "gemini-2.0-flash"): Promise<{ ok: boolean; error?: string }> {
  const r = await geminiGenerate(apiKey, model, [{ text: "Javob: OK" }], {});
  if (r.ok) return { ok: true };
  return { ok: false, error: r.body.slice(0, 200) };
}
