import { z } from "zod";

import { optionalText } from "@/lib/validators/form";

/**
 * PORTFOLIO VA KO'NIKMA FORMALARI
 *
 * Xato xabarlari o'zbekcha va SHU YERDA — ular Zod schemasining bir
 * qismi.
 */

/** Portfolio ishi yaratilishi mumkin bo'lgan eng eski yil. */
const MIN_YEAR = 2000;

/**
 * Eng katta yil — joriy yildan bittasi ko'p.
 *
 * NEGA JORIY YILDAN KO'P: dekabrda boshlangan va yanvarda tugaydigan
 * ish uchun keyingi yilni yozish tabiiy. Undan uzoq kelajak esa xato.
 *
 * Qiymat FUNKSIYA orqali olinadi: modul yuklanganda hisoblansa,
 * server yil almashganda qayta ishga tushmaguncha eski qiymatda
 * qolib ketardi.
 */
function maxYear(): number {
  return new Date().getFullYear() + 1;
}

/**
 * Ixtiyoriy tashqi havola — `https` majburiy.
 *
 * Portfolio havolasi foydalanuvchini boshqa saytga olib ketadi va
 * `http` orqali uni kuzatish mumkin.
 */
const optionalHttpsUrl = z
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
        message: "Havola to'liq bo'lsin. Masalan: https://loyiha.uz",
      });
      return;
    }

    if (url.protocol !== "https:") {
      ctx.addIssue({ code: "custom", message: "Havola https:// bilan boshlansin" });
    }
  });

/**
 * Texnologiyalar — vergul bilan ajratilgan matn.
 *
 * NEGA ERKIN MATN, ro'yxatdan tanlash emas: portfolio ishida
 * ishlatilgan texnologiya har xil bo'ladi va uni oldindan sanab
 * bo'lmaydi. Ko'nikmalar ro'yxati esa aksincha — u tanlanadi, chunki
 * u bo'yicha QIDIRUV ishlaydi va erkin matn qidiruvni buzardi.
 */
const techField = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      // Bo'sh bo'laklarni tashlaymiz: "React, , Next" → 2 element.
      .filter((item) => item.length > 0)
      // Takrorlanishni olib tashlaymiz.
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 12)
  )
  .refine((items) => items.every((item) => item.length <= 30), {
    message: "Har bir texnologiya nomi 30 belgidan oshmasin",
  });

export const portfolioItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Sarlavha kamida 3 belgi bo'lsin")
    .max(120, "Sarlavha 120 belgidan oshmasin"),
  description: optionalText(1000),
  url: optionalHttpsUrl,
  tech: techField,
  year: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) return;

      const parsed = Number(value);

      if (!Number.isInteger(parsed)) {
        ctx.addIssue({ code: "custom", message: "Yilni raqam bilan kiriting" });
        return;
      }

      if (parsed < MIN_YEAR || parsed > maxYear()) {
        ctx.addIssue({
          code: "custom",
          message: `Yil ${MIN_YEAR}–${maxYear()} oralig'ida bo'lsin`,
        });
      }
    })
    .transform((value) => (value === undefined ? undefined : Number(value))),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;

/** Tahrirlash — `id` qo'shiladi. */
export const editPortfolioItemSchema = portfolioItemSchema.extend({
  itemId: z.string().min(1),
});

export const portfolioItemIdSchema = z.object({
  itemId: z.string().min(1),
});

export const portfolioVisibilitySchema = z.object({
  itemId: z.string().min(1),
  // Tugma qiymati: "show" yoki "hide". Boolean emas — checkbox emas,
  // tugma bosiladi.
  visible: z.enum(["show", "hide"]),
});

export const portfolioMoveSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Ko'nikmalar
// ─────────────────────────────────────────────────────────────────────────────

export const addSkillSchema = z.object({
  skillId: z.string().min(1, "Ko'nikmani tanlang"),
  level: z.coerce
    .number()
    .int()
    .min(1, "Daraja 1 dan 5 gacha")
    .max(5, "Daraja 1 dan 5 gacha"),
  yearsExperience: z.coerce
    .number()
    .int("Butun son kiriting")
    .min(0, "Manfiy bo'lmaydi")
    .max(60, "60 yildan ko'p tajriba — xato kiritilgan bo'lsa kerak"),
});

export const removeSkillSchema = z.object({
  skillId: z.string().min(1),
});
