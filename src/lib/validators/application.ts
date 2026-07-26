import { z } from "zod";

import { emailField, nameField, phoneField } from "@/lib/validators/auth";
import { optionalText } from "@/lib/validators/form";

/**
 * MUTAXASSIS ARIZASI — forma tekshiruvi
 *
 * Xato xabarlari o'zbekcha va SHU YERDA — ular Zod schemasining bir
 * qismi.
 */

/** Ixtiyoriy `https` havola. */
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

      if (host && !url.hostname.endsWith(host)) {
        ctx.addIssue({
          code: "custom",
          message: `Bu maydonga ${host} havolasi kiritiladi`,
        });
      }
    });
}

/** Telegram username — `@` bilan ham qabul qilinadi. */
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

/**
 * Ko'nikmalar — vergul bilan ajratilgan matn.
 *
 * NEGA ERKIN MATN: arizada odam o'zi bilgan narsani yozadi va bizning
 * ro'yxatimizda bo'lmagan texnologiya ham bo'lishi mumkin. Ariza
 * TASDIQLANGACH profildagi ko'nikmalar ro'yxatdan tanlanadi — u yerda
 * qidiruv ishlaydi.
 */
const skillsField = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 20)
  )
  .refine((items) => items.length > 0, {
    message: "Kamida bitta ko'nikma yozing",
  })
  .refine((items) => items.every((item) => item.length <= 40), {
    message: "Har bir ko'nikma nomi 40 belgidan oshmasin",
  });

export const applicationSchema = z.object({
  fullName: nameField,
  phone: phoneField,
  email: emailField,
  telegram: telegramField,
  github: optionalUrl("github.com"),
  linkedin: optionalUrl("linkedin.com"),
  portfolio: optionalUrl(),
  yearsExperience: z.coerce
    .number()
    .int("Butun son kiriting")
    .min(0, "Manfiy bo'lmaydi")
    .max(60, "60 yildan ko'p tajriba — xato kiritilgan bo'lsa kerak"),
  motivation: optionalText(1500),
  skills: skillsField,
});

export type ApplicationFormInput = z.infer<typeof applicationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test javoblari.
 *
 * Maydon nomlari `answer:<questionId>` ko'rinishida keladi — savollar
 * databasedan olinadi va ularni oldindan sanab bo'lmaydi. Shu sababli
 * schema erkin kalitlarni qabul qiladi va `parseTestAnswers` ularni
 * ajratib oladi.
 */
export function parseTestAnswers(formData: FormData): Record<string, string> {
  const answers: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) continue;
    if (typeof value !== "string") continue;

    const questionId = key.slice("answer:".length);
    if (questionId === "") continue;

    /**
     * Uzun javoblarni KESAMIZ, rad etmaymiz.
     *
     * Kod savoliga uzun javob normal. Cheksiz qabul qilish esa
     * database'ni to'ldirish yo'li — 20 000 belgi eng batafsil javob
     * uchun ham yetadi.
     */
    answers[questionId] = value.slice(0, 20_000);
  }

  return answers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

export const applicationIdSchema = z.object({
  applicationId: z.string().min(1),
});

export const approveApplicationSchema = z.object({
  applicationId: z.string().min(1),
  notes: optionalText(1000),
});

export const rejectApplicationSchema = z.object({
  applicationId: z.string().min(1),
  // Sabab MAJBURIY: "rad etildi" degan xabar foydalanuvchiga hech
  // narsa bermaydi.
  reason: z
    .string()
    .trim()
    .min(10, "Sababni kamida 10 belgi bilan tushuntiring")
    .max(1000, "Sabab 1000 belgidan oshmasin"),
});
