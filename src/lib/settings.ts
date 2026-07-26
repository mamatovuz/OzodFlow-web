import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { percentToBps } from "@/lib/money";

/**
 * Tizim sozlamalari.
 *
 * QOIDA: hech qanday biznes qoidasi kodda qattiq yozilmaydi. Komissiya foizi,
 * minimal yechib olish summasi, ta'mirlash rejimi — hammasi `Setting`
 * jadvalidan o'qiladi va admin panelda o'zgartiriladi.
 *
 * `.env` dagi qiymatlar faqat BOSHLANG'ICH qiymat: birinchi ishga tushishda
 * jadvalga yoziladi, keyin jadval ustun bo'ladi.
 */

export const SETTING_KEYS = {
  /** Platforma komissiyasi, basis point (1500 = 15%) */
  COMMISSION_BPS: "payments.commission_bps",
  /** Minimal yechib olish summasi, tiyin */
  MIN_WITHDRAWAL: "payments.min_withdrawal",
  /** Yechib olishdan ushlanadigan to'lov, basis point */
  WITHDRAWAL_FEE_BPS: "payments.withdrawal_fee_bps",
  /** Yangi loyiha adminda tekshiruvdan o'tsinmi */
  MODERATE_PROJECTS: "projects.require_moderation",
  /** Bitta loyihaga maksimal taklif soni */
  MAX_PROPOSALS: "projects.max_proposals",
  /** Mijoz so'rashi mumkin bo'lgan bepul tuzatishlar soni */
  FREE_REVISIONS: "projects.free_revisions",
  /** Developer arizasidan o'tish uchun minimal test bali */
  MIN_TEST_SCORE: "developers.min_test_score",
  /** Ta'mirlash rejimi */
  MAINTENANCE_MODE: "system.maintenance_mode",
  /** Yangi ro'yxatdan o'tish ochiqmi */
  REGISTRATION_OPEN: "system.registration_open",
  /** Referal mukofoti, tiyin */
  REFERRAL_REWARD: "growth.referral_reward",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/**
 * Zaxira qiymatlar — jadval ham, `.env` ham ishonchli bo'lmaganda.
 *
 * Nega kerak: Docker image yasashda `SKIP_ENV_VALIDATION=1` qo'yiladi va
 * `env` obyekti tekshirilmagan `process.env` bo'lib qoladi. O'sha paytda
 * `PLATFORM_COMMISSION_PERCENT` berilmagan bo'lsa `percentToBps(undefined)`
 * → `NaN` bo'lib, `applyBps` xato tashlaydi va BUILD YIQILADI (bosh sahifa
 * escrow diagrammasini oldindan render qiladi).
 *
 * Shuning uchun env'dan olingan har bir raqam tekshiriladi.
 */
const FALLBACK_COMMISSION_BPS = 1500; // 15%
const FALLBACK_MIN_WITHDRAWAL_TIYIN = 10_000_000; // 100 000 so'm

/** `.env` dagi komissiya foizini bps ga o'giradi, ishonchsiz qiymatni rad etadi. */
function envCommissionBps(): number {
  const percent = Number(env.PLATFORM_COMMISSION_PERCENT);
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
    return FALLBACK_COMMISSION_BPS;
  }

  const bps = percentToBps(percent);
  return Number.isInteger(bps) && bps >= 0 && bps <= 10_000
    ? bps
    : FALLBACK_COMMISSION_BPS;
}

/** `.env` dagi minimal yechib olish summasini tiyinga o'giradi. */
function envMinWithdrawalTiyin(): number {
  const amount = Number(env.MIN_WITHDRAWAL_AMOUNT);
  if (!Number.isFinite(amount) || amount < 0) return FALLBACK_MIN_WITHDRAWAL_TIYIN;
  return Math.round(amount) * 100;
}

/**
 * Sozlamaning boshlang'ich qiymatlari va tavsifi.
 * Seed shu ro'yxatdan jadval to'ldiradi.
 */
export const DEFAULT_SETTINGS: Array<{
  key: SettingKey;
  value: unknown;
  group: string;
  label: string;
  description: string;
  isProtected: boolean;
}> = [
  {
    key: SETTING_KEYS.COMMISSION_BPS,
    value: envCommissionBps(),
    group: "payments",
    label: "Platforma komissiyasi",
    description:
      "Basis point: 1500 = 15%. Loyiha yaratilganda MUZLATILADI — bu qiymatni " +
      "o'zgartirish mavjud loyihalarga ta'sir qilmaydi, faqat yangilariga.",
    isProtected: true,
  },
  {
    key: SETTING_KEYS.MIN_WITHDRAWAL,
    value: envMinWithdrawalTiyin(),
    group: "payments",
    label: "Minimal yechib olish summasi",
    description: "Tiyinda. Bundan kam summani yechib olish so'rovi qabul qilinmaydi.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.WITHDRAWAL_FEE_BPS,
    value: 0,
    group: "payments",
    label: "Yechib olish to'lovi",
    description: "Basis point. 0 = bepul.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.MODERATE_PROJECTS,
    value: true,
    group: "projects",
    label: "Loyihalarni moderatsiya qilish",
    description:
      "Yoqilganda yangi loyiha avval admin tekshiruvidan o'tadi, keyin " +
      "mutaxassislarga ko'rinadi. Spam va firibgarlikdan himoya.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.MAX_PROPOSALS,
    value: 20,
    group: "projects",
    label: "Maksimal taklif soni",
    description: "Bitta loyihaga shundan ko'p taklif qabul qilinmaydi.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.FREE_REVISIONS,
    value: 2,
    group: "projects",
    label: "Bepul tuzatishlar soni",
    description: "Mijoz shu miqdorda bepul tuzatish so'rashi mumkin.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.MIN_TEST_SCORE,
    value: 70,
    group: "developers",
    label: "Minimal test bali",
    description: "0..100. Bundan past ball olgan ariza avtomatik rad etiladi.",
    isProtected: false,
  },
  {
    key: SETTING_KEYS.MAINTENANCE_MODE,
    value: false,
    group: "system",
    label: "Ta'mirlash rejimi",
    description: "Yoqilganda adminlardan boshqa hamma uchun sayt yopiladi.",
    isProtected: true,
  },
  {
    key: SETTING_KEYS.REGISTRATION_OPEN,
    value: true,
    group: "system",
    label: "Ro'yxatdan o'tish ochiq",
    description: "O'chirilganda yangi foydalanuvchi ro'yxatdan o'ta olmaydi.",
    isProtected: true,
  },
  {
    key: SETTING_KEYS.REFERRAL_REWARD,
    value: 5_000_000,
    group: "growth",
    label: "Referal mukofoti",
    description: "Tiyinda. Taklif qilingan foydalanuvchi birinchi loyihasini tugatgach beriladi.",
    isProtected: false,
  },
];

/**
 * Sozlamani o'qiydi va tekshiradi.
 *
 * Jadvalda yo'q bo'lsa yoki qiymat buzuq bo'lsa — `fallback`. Sozlama
 * o'qilmagani uchun to'lov oqimi to'xtab qolmasligi kerak.
 */
export async function getSetting<T>(
  key: SettingKey,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  try {
    const row = await db.setting.findUnique({ where: { key }, select: { value: true } });
    if (!row) return fallback;

    const parsed = schema.safeParse(JSON.parse(row.value));
    if (!parsed.success) {
      console.warn(`[settings] "${key}" qiymati mos kelmadi, zaxira ishlatildi`);
      return fallback;
    }

    return parsed.data;
  } catch (error) {
    console.error(`[settings] "${key}" o'qilmadi:`, error);
    return fallback;
  }
}

/** Bir nechta sozlamani bitta so'rovda o'qiydi (admin paneli uchun). */
export async function getSettingsByGroup(group: string) {
  return db.setting.findMany({
    where: { group },
    orderBy: { key: "asc" },
  });
}

/** Barcha sozlamalar, guruhlangan holda (admin paneli uchun). */
export async function getAllSettings() {
  return db.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
    select: {
      key: true,
      value: true,
      group: true,
      label: true,
      description: true,
      isProtected: true,
      updatedAt: true,
    },
  });
}

/**
 * Sozlama qiymatini yozadi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QIYMAT SXEMA BILAN TEKSHIRILADI
 *
 *  Sozlamalar JSON matn sifatida saqlanadi, ya'ni `"abc"` ni komissiya
 *  maydoniga yozib qo'yish mumkin. Keyin `getCommissionBps` zaxira
 *  qiymatga qaytadi va admin foizni o'zgartirganini KO'RADI-yu, u
 *  ishlamaydi — jimgina buziladigan xato.
 *
 *  Shu sababli yozishdan oldin sxema tekshiriladi va xato bo'lsa
 *  RAD ETILADI.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function setSetting<T>(params: {
  key: SettingKey;
  value: T;
  schema: z.ZodType<T>;
}): Promise<void> {
  const parsed = params.schema.safeParse(params.value);

  if (!parsed.success) {
    throw new Error(
      `Sozlama qiymati mos kelmadi (${params.key}): ` +
        parsed.error.issues.map((issue) => issue.message).join(", ")
    );
  }

  const existing = DEFAULT_SETTINGS.find((item) => item.key === params.key);

  await db.setting.upsert({
    where: { key: params.key },
    update: { value: JSON.stringify(parsed.data) },
    // Yozuv yo'q bo'lsa yaratamiz — seed ishlamagan holatda ham
    // admin sozlamani o'zgartira olishi kerak.
    create: {
      key: params.key,
      value: JSON.stringify(parsed.data),
      group: existing?.group ?? "system",
      label: existing?.label ?? params.key,
      description: existing?.description ?? "",
      isProtected: existing?.isProtected ?? false,
    },
  });
}



// ─────────────────────────────────────────────────────────────────────────────
// Tipli qulay o'quvchilar
// ─────────────────────────────────────────────────────────────────────────────

const bpsSchema = z.number().int().min(0).max(10_000);
const amountSchema = z.number().int().nonnegative();

/**
 * Hozirgi komissiya foizi (bps).
 *
 * DIQQAT: bu qiymat yangi loyiha yaratilganda `Project.commissionBps` ga
 * KO'CHIRILADI. Escrow hisob-kitobida har doim loyihadagi muzlatilgan
 * qiymat ishlatiladi, bu funksiya emas — aks holda admin foizni o'zgartirsa
 * yarim yo'ldagi loyihalarning matematikasi buzilardi.
 */
export async function getCommissionBps(): Promise<number> {
  return getSetting(SETTING_KEYS.COMMISSION_BPS, bpsSchema, envCommissionBps());
}

export async function getMinWithdrawal(): Promise<bigint> {
  const value = await getSetting(
    SETTING_KEYS.MIN_WITHDRAWAL,
    amountSchema,
    envMinWithdrawalTiyin()
  );
  return BigInt(value);
}

export async function getWithdrawalFeeBps(): Promise<number> {
  return getSetting(SETTING_KEYS.WITHDRAWAL_FEE_BPS, bpsSchema, 0);
}

export async function isMaintenanceMode(): Promise<boolean> {
  return getSetting(SETTING_KEYS.MAINTENANCE_MODE, z.boolean(), false);
}

export async function isRegistrationOpen(): Promise<boolean> {
  return getSetting(SETTING_KEYS.REGISTRATION_OPEN, z.boolean(), true);
}

export async function getFreeRevisionCount(): Promise<number> {
  return getSetting(SETTING_KEYS.FREE_REVISIONS, z.number().int().min(0), 2);
}

export async function getMaxProposals(): Promise<number> {
  return getSetting(SETTING_KEYS.MAX_PROPOSALS, z.number().int().min(1), 20);
}

/**
 * Yangi loyiha admin tekshiruvidan o'tishi kerakmi.
 *
 * Yoqilgan bo'lsa loyiha PENDING_REVIEW holatida turadi — spam va
 * firibgarlikdan himoya. Standart holat: YOQILGAN.
 */
export async function isProjectModerationEnabled(): Promise<boolean> {
  return getSetting(SETTING_KEYS.MODERATE_PROJECTS, z.boolean(), true);
}

/**
 * Kalit bo'yicha sxema.
 *
 * Admin paneli ixtiyoriy kalitni yuborishi mumkin, shuning uchun har
 * biri uchun sxema SHU YERDA qat'iy belgilanadi. Ro'yxatda yo'q kalit
 * qabul qilinmaydi.
 */
export const SETTING_SCHEMAS: Record<SettingKey, z.ZodType<unknown>> = {
  [SETTING_KEYS.COMMISSION_BPS]: bpsSchema,
  [SETTING_KEYS.MIN_WITHDRAWAL]: amountSchema,
  [SETTING_KEYS.WITHDRAWAL_FEE_BPS]: bpsSchema,
  [SETTING_KEYS.MODERATE_PROJECTS]: z.boolean(),
  [SETTING_KEYS.MAX_PROPOSALS]: z.number().int().min(1).max(500),
  [SETTING_KEYS.FREE_REVISIONS]: z.number().int().min(0).max(20),
  [SETTING_KEYS.MIN_TEST_SCORE]: z.number().int().min(0).max(100),
  [SETTING_KEYS.MAINTENANCE_MODE]: z.boolean(),
  [SETTING_KEYS.REGISTRATION_OPEN]: z.boolean(),
  [SETTING_KEYS.REFERRAL_REWARD]: amountSchema,
};

/** Kalit bizga tanishmi. */
export function isKnownSettingKey(key: string): key is SettingKey {
  return key in SETTING_SCHEMAS;
}
