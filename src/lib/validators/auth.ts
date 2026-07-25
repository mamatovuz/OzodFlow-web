import { z } from "zod";

// `password.ts` dan EMAS, `password-strength.ts` dan: validatorlar
// bcryptjs'ga bog'lanib qolmasligi kerak.
import {
  PASSWORD_MIN_LENGTH,
  checkPasswordStrength,
} from "@/lib/auth/password-strength";
import { OtpChannel, OtpPurpose, UserRole, valuesOf } from "@/lib/enums";
import { checkbox } from "@/lib/validators/form";
import { normalizeEmail, normalizePhone } from "@/lib/utils";

/**
 * AUTH FORMALARINI TEKSHIRISH
 *
 * Xato xabarlari FOYDALANUVCHI O'QISHI uchun yozilgan, developer uchun emas.
 * "Invalid input" emas — "Email formati noto'g'ri, masalan ism@mail.uz".
 *
 * Barcha xabarlar o'zbekcha va shu yerda turadi (tarjima faylida emas),
 * chunki ular Zod schemasining bir qismi. Ko'p tilga o'tganda bu joy
 * `messages` bilan bog'lanadi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Asosiy maydonlar
// ─────────────────────────────────────────────────────────────────────────────

export const emailField = z
  .string()
  .trim()
  .min(1, "Email kiritilishi shart")
  .max(254, "Email juda uzun")
  .transform(normalizeEmail)
  .pipe(z.email("Email formati noto'g'ri. Masalan: ism@mail.uz"));

/**
 * Telefon raqami — O'zbekiston formatiga normalizatsiya qilinadi.
 *
 * Normalizatsiya MUHIM: "+998 93 230 34 10", "998932303410" va "932303410"
 * bir xil raqam. Normalizatsiya bo'lmasa bitta odam uchun uchta hisob
 * yaratilib qolardi.
 */
export const phoneField = z
  .string()
  .trim()
  .min(1, "Telefon raqami kiritilishi shart")
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);

    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Telefon raqami noto'g'ri. Masalan: +998 90 123 45 67",
      });
      return z.NEVER;
    }

    return normalized;
  });

export const nameField = z
  .string()
  .trim()
  .min(2, "Ism kamida 2 belgidan iborat bo'lsin")
  .max(80, "Ism juda uzun")
  // Raqam va maxsus belgilardan iborat "ism" — odatda spam.
  .refine((value) => /\p{L}/u.test(value), {
    message: "Ismda kamida bitta harf bo'lishi kerak",
  });

/**
 * Parol maydoni — `checkPasswordStrength` bilan bir xil qoidalarni qo'llaydi.
 *
 * Nega ikki joyda emas, bittada: qoidalar `password.ts` da, bu yerda esa
 * ularning natijasi Zod xatosiga aylantiriladi. Shunda qoida o'zgarsa
 * bitta joyni tuzatish kifoya.
 */
export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Parol kamida ${PASSWORD_MIN_LENGTH} belgi bo'lsin`)
  .superRefine((value, ctx) => {
    const check = checkPasswordStrength(value);

    if (!check.ok) {
      for (const problem of check.problems) {
        ctx.addIssue({ code: "custom", message: problem });
      }
    }
  });

/** Kirish paytidagi parol — mustahkamlik tekshirilmaydi, faqat bo'sh emasligi. */
const loginPasswordField = z.string().min(1, "Parol kiritilishi shart");

export const otpCodeField = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Kod faqat raqamlardan iborat bo'lishi kerak");

/**
 * Email yoki telefon — kirish uchun "identifikator".
 *
 * Foydalanuvchi ikkisidan birini kiritishi mumkin, forma bitta maydon
 * bo'ladi. Bu qaysi turi ekanini aniqlab, normalizatsiya qiladi.
 */
export const identifierField = z
  .string()
  .trim()
  .min(1, "Email yoki telefon raqamini kiriting")
  .transform((value, ctx) => {
    // `@` bor — email deb qaraymiz.
    if (value.includes("@")) {
      const parsed = z.email().safeParse(normalizeEmail(value));

      if (!parsed.success) {
        ctx.addIssue({ code: "custom", message: "Email formati noto'g'ri" });
        return z.NEVER;
      }

      return { kind: "email" as const, value: parsed.data };
    }

    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({
        code: "custom",
        message: "Email yoki telefon raqamini to'g'ri kiriting",
      });
      return z.NEVER;
    }

    return { kind: "phone" as const, value: phone };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Formalar
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  identifier: identifierField,
  password: loginPasswordField,
  /** "Meni eslab qol" — hozircha refresh token muddatiga ta'sir qiladi */
  remember: checkbox(),
  /** Kirgandan keyin qaytadigan sahifa */
  next: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Ro'yxatdan o'tish.
 *
 * Rol tanlovi ATAYLAB cheklangan: faqat CUSTOMER yoki DEVELOPER.
 * ADMIN rolini forma orqali olish MUMKIN EMAS — u faqat super admin
 * tomonidan beriladi. Bu ro'yxatni `UserRole` dan avtomatik olsak,
 * kelajakda yangi rol qo'shilganda u ham ochilib qolardi.
 */
export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    passwordConfirm: z.string().min(1, "Parolni tasdiqlang"),
    role: z.enum([UserRole.CUSTOMER, UserRole.DEVELOPER], {
      message: "Rol tanlanishi kerak",
    }),
    acceptTerms: checkbox(),
    /** Referal kodi — havola orqali kelgan bo'lsa */
    referralCode: z.string().trim().max(40).optional(),
    /**
     * Honeypot: bu maydon formada YASHIRIN. Odam uni ko'rmaydi va
     * to'ldirmaydi, bot esa barcha maydonlarni to'ldiradi. To'ldirilgan
     * bo'lsa — bot.
     */
    website: z.string().max(200).optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parollar mos kelmadi",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.acceptTerms, {
    message: "Foydalanish shartlarini qabul qilish kerak",
    path: ["acceptTerms"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const otpRequestSchema = z.object({
  identifier: identifierField,
  purpose: z.enum(valuesOf(OtpPurpose)).default(OtpPurpose.LOGIN),
  website: z.string().max(200).optional(),
});

export const otpVerifySchema = z.object({
  identifier: identifierField,
  code: otpCodeField,
  purpose: z.enum(valuesOf(OtpPurpose)).default(OtpPurpose.LOGIN),
  next: z.string().max(500).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
  website: z.string().max(200).optional(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Havola yaroqsiz"),
    password: passwordField,
    passwordConfirm: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parollar mos kelmadi",
    path: ["passwordConfirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Hozirgi parolni kiriting"),
    password: passwordField,
    passwordConfirm: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parollar mos kelmadi",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.currentPassword !== data.password, {
    message: "Yangi parol eskisidan farq qilishi kerak",
    path: ["password"],
  });

/** OTP yuborish kanali tanlovi. */
export const otpChannelSchema = z.enum(valuesOf(OtpChannel));
