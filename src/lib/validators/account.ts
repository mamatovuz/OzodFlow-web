import { z } from "zod";

import { Availability } from "@/lib/enums";
import { sumToTiyin } from "@/lib/money";
import { emailField, nameField } from "@/lib/validators/auth";
import { checkbox, optionalText } from "@/lib/validators/form";

/**
 * SOZLAMALAR FORMALARINI TEKSHIRISH
 *
 * Xato xabarlari o'zbekcha va SHU YERDA — ular Zod schemasining bir
 * qismi. Ko'p tilga o'tganda bu joy `messages` bilan bog'lanadi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ommaviy manzil
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `ozodflow.uz/dev/{username}` uchun manzil.
 *
 * Qoidalar sabablari bilan:
 *   • kichik harf — manzil katta-kichik harfga sezgir bo'lmasligi kerak
 *   • faqat harf, raqam, tire — URL'da xavfsiz
 *   • tire bilan boshlanmaydi/tugamaydi — chalkash ko'rinadi
 *   • 3-30 belgi — juda qisqasi band qilib olinadi, uzuni o'qilmaydi
 *   • zahiralangan so'zlar — marshrutlar bilan to'qnashmasligi kerak
 */
const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "dev",
  "developers",
  "login",
  "logout",
  "me",
  "messages",
  "new",
  "ozodflow",
  "privacy",
  "profile",
  "projects",
  "register",
  "settings",
  "support",
  "terms",
  "wallet",
  "webhook",
]);

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Manzil kamida 3 belgi bo'lsin")
  .max(30, "Manzil 30 belgidan oshmasin")
  .regex(
    /^[a-z0-9-]+$/,
    "Faqat lotin harflari, raqamlar va tire ishlatiladi"
  )
  .refine((value) => !value.startsWith("-") && !value.endsWith("-"), {
    message: "Manzil tire bilan boshlanmasligi va tugamasligi kerak",
  })
  .refine((value) => !value.includes("--"), {
    message: "Ketma-ket ikki tire bo'lmaydi",
  })
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: "Bu manzil tizim uchun band",
  });

// ─────────────────────────────────────────────────────────────────────────────
// Havolalar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ixtiyoriy tashqi havola.
 *
 * `https` MAJBURIY: profilda ko'rsatilgan havola foydalanuvchini olib
 * ketadi va `http` orqali uni kuzatish mumkin. Bo'sh qoldirish esa
 * mumkin — hamma GitHub ishlatmaydi.
 */
function optionalUrl(host?: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) return;

      let url: URL;
      try {
        url = new URL(value);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Havola to'liq bo'lsin. Masalan: https://github.com/ism",
        });
        return;
      }

      if (url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "Havola https:// bilan boshlansin" });
        return;
      }

      // Ma'lum xizmat kutilayotgan bo'lsa domenni tekshiramiz — aks
      // holda "GitHub" maydonida boshqa sayt turishi mumkin.
      if (host && !url.hostname.endsWith(host)) {
        ctx.addIssue({
          code: "custom",
          message: `Bu maydonga ${host} havolasi kiritiladi`,
        });
      }
    });
}

/** Telegram username — `@` bilan ham, bo'lmasa ham qabul qilinadi. */
const telegramField = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, ""))
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) return;

    if (!/^[a-zA-Z0-9_]{5,32}$/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Telegram username 5-32 belgi: harf, raqam va pastki chiziq",
      });
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy profil
// ─────────────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: nameField,
  // Manzil ixtiyoriy: mijozga ommaviy profil kerak emas.
  username: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .pipe(usernameField.optional()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Developer profili
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soatlik narx — SO'MDA kiritiladi, TIYINGA aylantiriladi.
 *
 * Yuqori chegara 10 mln so'm/soat: bundan katta qiymat deyarli har doim
 * xato (qo'shimcha nol). Cheklov bo'lmasa profil kulguli ko'rinadi.
 */
const MAX_HOURLY_RATE_SUM = 10_000_000;

const hourlyRateField = z
  .string()
  .trim()
  // Bo'sh maydon = 0 (narx ko'rsatilmaydi). Ming ajratuvchi bo'shliqlar
  // olib tashlanadi: "50 000" ham qabul qilinadi.
  .transform((value) => (value === "" ? "0" : value.replace(/\s/g, "")))
  .superRefine((value, ctx) => {
    // `z.coerce.number()` ATAYLAB ishlatilmadi: uning kirish tipi
    // `unknown` va `.pipe()` bilan tiplar to'qnashadi. Qo'lda
    // tekshirish esa xato xabarini ham aniqroq beradi.
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Narxni raqam bilan kiriting" });
      return;
    }

    if (!Number.isInteger(parsed)) {
      ctx.addIssue({ code: "custom", message: "Narx butun son bo'lsin" });
      return;
    }

    if (parsed < 0) {
      ctx.addIssue({ code: "custom", message: "Narx manfiy bo'lmaydi" });
      return;
    }

    if (parsed > MAX_HOURLY_RATE_SUM) {
      ctx.addIssue({
        code: "custom",
        message: "Narx juda katta — qo'shimcha nol yozilmadimi?",
      });
    }
  })
  .transform((value) => sumToTiyin(Number(value)));

/** Tillar: ko'p tanlovli checkbox guruhi. */
export const LANGUAGE_CODES = ["uz", "ru", "en", "tr", "ar"] as const;

const languagesField = z
  .union([z.string(), z.array(z.string()), z.undefined()])
  .transform((value) => {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  })
  .pipe(
    z
      .array(z.enum(LANGUAGE_CODES))
      .max(LANGUAGE_CODES.length)
      // Takrorlanishni olib tashlaymiz — `createMany` unique cheklovga
      // urilib qolmasligi kerak.
      .transform((codes) => [...new Set(codes)])
  );

export const updateDeveloperSchema = z.object({
  headline: optionalText(120),
  bio: optionalText(2000),
  location: optionalText(80),
  githubUrl: optionalUrl("github.com"),
  linkedinUrl: optionalUrl("linkedin.com"),
  portfolioUrl: optionalUrl(),
  telegramUsername: telegramField,
  yearsExperience: z.coerce
    .number()
    .int("Butun son kiriting")
    .min(0, "Manfiy bo'lmaydi")
    .max(60, "60 yildan ko'p tajriba — xato kiritilgan bo'lsa kerak"),
  hourlyRate: hourlyRateField,
  availability: z.enum([
    Availability.AVAILABLE,
    Availability.BUSY,
    Availability.AWAY,
  ]),
  acceptingWork: checkbox(),
  languages: languagesField,
});

export type UpdateDeveloperInput = z.infer<typeof updateDeveloperSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

export const changeEmailSchema = z.object({
  email: emailField,
  // Parol MAJBURIY: email — parolni tiklash kanali.
  currentPassword: z.string().min(1, "Parolni kiriting"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Qurilmalar
// ─────────────────────────────────────────────────────────────────────────────

export const revokeDeviceSchema = z.object({
  sessionId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Xabarnomalar
// ─────────────────────────────────────────────────────────────────────────────

/** "HH:MM" formatidagi vaqt yoki bo'sh. */
const quietHourField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .superRefine((value, ctx) => {
    if (value === null) return;

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "Vaqt formati: 22:00" });
    }
  });

export const notificationsSchema = z
  .object({
    email: checkbox(),
    telegram: checkbox(),
    push: checkbox(),
    sms: checkbox(),
    quietHoursStart: quietHourField,
    quietHoursEnd: quietHourField,
  })
  .refine(
    // Ikkisi ham bo'lishi yoki ikkisi ham bo'lmasligi kerak: bittasi
    // yozilgan oraliq ma'nosiz.
    (data) =>
      (data.quietHoursStart === null) === (data.quietHoursEnd === null),
    {
      message: "Oraliqning boshi va oxirini ham kiriting",
      path: ["quietHoursEnd"],
    }
  );

export type NotificationsInput = z.infer<typeof notificationsSchema>;
