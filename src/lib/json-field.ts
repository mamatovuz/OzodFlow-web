/**
 * SQLite'da `Json` tipi yo'q, shuning uchun schema'da ular `String` sifatida
 * turadi (maydon nomi `...Json` bilan tugaydi). Bu fayl ularni xavfsiz
 * o'qish/yozishni ta'minlaydi.
 *
 * Nega shart: `JSON.parse` buzuq matnda exception tashlaydi. Agar bu
 * to'g'ridan-to'g'ri render paytida chaqirilsa, bitta buzuq yozuv butun
 * sahifani yiqitadi. Shuning uchun har doim zaxira qiymat bilan o'qiymiz.
 */

import { z } from "zod";

/**
 * JSON matnni tekshirib o'qiydi. Buzuq yoki schema'ga mos kelmasa —
 * `fallback` qaytadi va konsolga ogohlantirish yoziladi (jimgina yutilmaydi).
 */
export function readJsonField<T>(
  raw: string | null | undefined,
  schema: z.ZodType<T>,
  fallback: T,
  context?: string
): T {
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[json-field] Buzuq JSON${context ? ` (${context})` : ""}: ${raw.slice(0, 120)}`);
    return fallback;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `[json-field] JSON schema'ga mos kelmadi${context ? ` (${context})` : ""}: ` +
        result.error.issues.map((issue) => issue.message).join(", ")
    );
    return fallback;
  }

  return result.data;
}

/** Qiymatni JSON matnga aylantiradi (DB'ga yozish uchun). */
export function writeJsonField(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'p ishlatiladigan schema'lar
// ─────────────────────────────────────────────────────────────────────────────

/** Oddiy matn ro'yxati: ko'nikmalar, texnologiyalar, teglar. */
export const stringListSchema = z.array(z.string());

export function readStringList(raw: string | null | undefined, context?: string): string[] {
  return readJsonField(raw, stringListSchema, [], context);
}

/** Xabarnoma kanallari ro'yxati. */
export const channelListSchema = z.array(
  z.enum(["IN_APP", "EMAIL", "TELEGRAM", "SMS", "PUSH"])
);

/** Variantli test savoli uchun javob variantlari. */
export const questionOptionsSchema = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
  })
);

/** Fayl havolalari (ticket ilovalari). */
export const attachmentListSchema = z.array(
  z.object({
    url: z.string(),
    name: z.string(),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
  })
);

/**
 * Xabarnoma turini kanal bo'yicha o'chirish.
 *
 * Shakl: `{"PROJECT_MESSAGE": {"email": false}}` — "loyiha xabarlari
 * uchun email kerak emas, qolgan kanallar ishlasin".
 */
export const typeOverridesSchema = z.record(
  z.string(),
  z.record(z.string(), z.boolean())
);

/** Ixtiyoriy kalit-qiymat metadata. */
export const metaSchema = z.record(z.string(), z.unknown());
