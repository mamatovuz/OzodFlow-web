/**
 * Muhit o'zgaruvchilarini tekshirish.
 *
 * Ilova ishga tushganda `.env` to'g'ri to'ldirilganini SHU YERDA bir marta
 * tekshiramiz. Sababi: `process.env.JWT_ACCESS_SECRET` bo'sh bo'lsa, xato
 * to'lov oqimining o'rtasida chiqishidan ko'ra ishga tushishda chiqsin.
 *
 * Bu modul FAQAT serverda ishlaydi. Klientga kerakli qiymatlar
 * `src/lib/env.client.ts` da, `NEXT_PUBLIC_` prefiksi bilan.
 */

import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/env.ts brauzerda import qilindi. Bu fayl maxfiy kalitlarni o'qiydi — " +
      "klient kodida env.client.ts dan foydalaning."
  );
}

/** Bo'sh matnni `undefined` ga aylantiradi — `.env` da `KEY=` yozilgan holat. */
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/**
 * Bo'sh matnni `undefined` ga aylantiruvchi ixtiyoriy butun son.
 *
 * NEGA ALOHIDA: `z.coerce.number()` bo'sh matnni **0** ga aylantiradi.
 * Bu jimgina buziladigan xato manbai — masalan `INPAY_MERCHANT_ID=`
 * yozilgan bo'lsa qiymat `0` bo'lib qoladi, `isInpayConfigured()`
 * "sozlangan" deb qaytaradi va har to'lov shlyuzda
 * MERCHANT_NOT_FOUND bilan yiqiladi. Shu sababli bo'shlikni SONGA
 * AYLANTIRISHDAN OLDIN ushlaymiz.
 */
const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((value) =>
    value === undefined || value === "" ? undefined : Number(value)
  )
  .refine(
    (value) => value === undefined || Number.isInteger(value),
    "Butun son bo'lishi kerak"
  );

/** "15m", "30d", "3600s" ko'rinishidagi muddat. */
const duration = z
  .string()
  .regex(/^\d+[smhd]$/, "Muddat formati: 30s, 15m, 12h, 30d");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_APP_URL: z.url("NEXT_PUBLIC_APP_URL to'liq URL bo'lishi kerak"),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL to'ldirilishi shart"),

  // ── Auth ───────────────────────────────────────────────────────────────────
  // 32 belgi — HS256 uchun minimal maqbul uzunlik.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET kamida 32 belgi bo'lishi kerak"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET kamida 32 belgi bo'lishi kerak"),
  ACCESS_TOKEN_TTL: duration.default("15m"),
  REFRESH_TOKEN_TTL: duration.default("30d"),

  // ── Birinchi admin ─────────────────────────────────────────────────────────
  // Bo'sh bo'lishi mumkin: admin allaqachon yaratilgan bo'lsa kerak emas.
  OZODFLOW_ADMIN_EMAIL: z.union([z.email(), z.literal("")]).optional(),
  OZODFLOW_ADMIN_PASSWORD: optionalString,
  OZODFLOW_ADMIN_NAME: z.string().default("OzodFlow Admin"),

  // ── OTP ────────────────────────────────────────────────────────────────────
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),

  // ── Telegram ───────────────────────────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_ADMIN_CHAT_ID: optionalString,
  TELEGRAM_LOGIN_BOT_USERNAME: optionalString,

  // ── Email ──────────────────────────────────────────────────────────────────
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  MAIL_FROM: z.string().default("OzodFlow <noreply@ozodflow.uz>"),

  // ── S3 ─────────────────────────────────────────────────────────────────────
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("ozodflow"),
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_PUBLIC_URL: optionalString,

  // ── Platforma ──────────────────────────────────────────────────────────────
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(50).default(15),
  MIN_WITHDRAWAL_AMOUNT: z.coerce.number().int().min(0).default(100_000),
  DEFAULT_CURRENCY: z.string().default("UZS"),

  // ── inPAY to'lov shlyuzi ───────────────────────────────────────────────────
  // Merchant ma'lumotlari inpay.uz kabinetidan olinadi. Ikkisi ham
  // bo'lmasa shlyuz o'chirilgan holatda ishlaydi va to'ldirish qo'lda
  // tasdiqlanadi — sayt yiqilmaydi.
  //
  // `INPAY_MERCHANT_ID` SON sifatida tekshiriladi: shlyuz uni integer
  // kutadi. Panelga tasodifan matn yozilsa xato ISHGA TUSHISHDA
  // chiqadi, to'lov o'rtasida "MERCHANT_NOT_FOUND" bo'lib emas.
  INPAY_MERCHANT_ID: optionalInt,
  INPAY_MERCHANT_TOKEN: optionalString,

  // ── AI ─────────────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: optionalString,
  AI_MODEL: z.string().default("claude-sonnet-5"),

  // ── Redis ──────────────────────────────────────────────────────────────────
  REDIS_URL: optionalString,
});

export type Env = z.infer<typeof envSchema>;

/**
 * Sxema testlar uchun ochiladi.
 *
 * `env` singleton'i import paytida `process.env` ni o'qiydi, ya'ni uni
 * test ichida turli qiymatlar bilan qayta yuklab bo'lmaydi. Sxemaning
 * o'zini tekshirish esa mumkin — bo'sh qiymatlar bilan bo'ladigan
 * jimgina xatolar aynan shu darajada ushlanadi.
 */
export const envSchemaForTests = envSchema;

function loadEnv(): Env {
  // Docker image yasashda maxfiy kalitlar hali berilmagan bo'ladi —
  // build vaqtida tekshiruvni o'tkazib yuborish uchun.
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return process.env as unknown as Env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n╭─ Muhit sozlamalarida xato ─────────────────────────────────\n` +
        `${problems}\n` +
        `╰─ .env faylni tekshiring (namuna: .env.example)\n`
    );
  }

  return parsed.data;
}

export const env = loadEnv();

// ─────────────────────────────────────────────────────────────────────────────
// Qulaylik uchun hisoblangan qiymatlar
// ─────────────────────────────────────────────────────────────────────────────

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

/** Xizmat sozlanganmi — sozlanmagan bo'lsa jimgina o'chirib qo'yamiz. */
export const features = {
  email: Boolean(env.SMTP_HOST && env.SMTP_USER),
  telegram: Boolean(env.TELEGRAM_BOT_TOKEN),
  telegramLogin: Boolean(env.TELEGRAM_LOGIN_BOT_USERNAME && env.TELEGRAM_BOT_TOKEN),
  s3: Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
  ai: Boolean(env.ANTHROPIC_API_KEY),
  redis: Boolean(env.REDIS_URL),
  /**
   * To'lov shlyuzi (inPAY). O'chirilgan bo'lsa to'ldirish qo'lda
   * tasdiqlanadi — ikkala yo'l ham ishlaydi, UI shunga qarab moslashadi.
   */
  inpay: Boolean(env.INPAY_MERCHANT_ID && env.INPAY_MERCHANT_TOKEN),
} as const;
