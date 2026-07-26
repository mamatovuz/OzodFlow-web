import { z } from "zod";

import { MAX_AMOUNT_TIYIN, parseMoneyInput, sumToTiyin } from "@/lib/money";
import { optionalText } from "@/lib/validators/form";

/**
 * LOYIHA FORMALARINI TEKSHIRISH
 *
 * Pul maydonlari MATN sifatida keladi ("1 500 000") va shu yerda tiyinga
 * aylantiriladi. Klientda `type="number"` ishlatilmaydi: u probel bilan
 * ajratilgan raqamni qabul qilmaydi va mobil klaviaturada noqulay.
 */

/** Minimal loyiha byudjeti — juda kichik summalar spam belgisi. */
export const MIN_PROJECT_BUDGET = sumToTiyin(100_000);

/**
 * Pul maydoni: foydalanuvchi kiritgan matnni tiyinga aylantiradi.
 *
 * `parseMoneyInput` probel, vergul va apostrofni tushunadi va noto'g'ri
 * kiritishda `null` qaytaradi — biz uni Zod xatosiga aylantiramiz.
 */
function moneyField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} kiritilishi shart`)
    .transform((value, ctx) => {
      const amount = parseMoneyInput(value);

      if (amount === null) {
        ctx.addIssue({
          code: "custom",
          message: `${label} noto'g'ri. Masalan: 1 500 000`,
        });
        return z.NEVER;
      }

      if (amount <= 0n) {
        ctx.addIssue({ code: "custom", message: `${label} noldan katta bo'lsin` });
        return z.NEVER;
      }

      if (amount > MAX_AMOUNT_TIYIN) {
        ctx.addIssue({ code: "custom", message: `${label} juda katta` });
        return z.NEVER;
      }

      return amount;
    });
}

/**
 * Sana maydoni — `<input type="date">` dan "2026-08-15" ko'rinishida keladi.
 *
 * Vaqt kun OXIRIGA qo'yiladi: "15-avgustgacha" deganda foydalanuvchi
 * 15-avgust kunini ham nazarda tutadi. Yarim tundan boshlab hisoblasak
 * bir kun yo'qolardi.
 */
const deadlineField = z
  .string()
  .trim()
  .min(1, "Muddat tanlanishi shart")
  .transform((value, ctx) => {
    const date = new Date(`${value}T23:59:59`);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Sana noto'g'ri" });
      return z.NEVER;
    }

    // O'tgan sana — xato. Bugungi kun qabul qilinadi.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      ctx.addIssue({ code: "custom", message: "Muddat o'tgan sana bo'lishi mumkin emas" });
      return z.NEVER;
    }

    return date;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Loyiha yaratish
// ─────────────────────────────────────────────────────────────────────────────

export const createProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(10, "Sarlavha kamida 10 belgi bo'lsin")
      .max(120, "Sarlavha 120 belgidan oshmasin"),

    categoryId: z.string().min(1, "Yo'nalish tanlanishi shart"),
    serviceId: optionalText(60),

    description: z
      .string()
      .trim()
      .min(50, "Tavsif kamida 50 belgi bo'lsin — mutaxassisga aniq ma'lumot kerak")
      .max(5000, "Tavsif 5000 belgidan oshmasin"),

    requirements: optionalText(5000),

    budgetMin: moneyField("Minimal byudjet"),
    budgetMax: moneyField("Maksimal byudjet"),

    deadlineAt: deadlineField,

    isUrgent: z
      .union([z.literal("on"), z.undefined()])
      .transform((value) => value === "on"),
  })
  .refine((data) => data.budgetMin <= data.budgetMax, {
    message: "Minimal byudjet maksimaldan katta bo'lishi mumkin emas",
    path: ["budgetMax"],
  })
  .refine((data) => data.budgetMin >= MIN_PROJECT_BUDGET, {
    message: "Minimal byudjet 100 000 so'mdan kam bo'lmasin",
    path: ["budgetMin"],
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Taklif
// ─────────────────────────────────────────────────────────────────────────────

export const submitProposalSchema = z.object({
  projectId: z.string().min(1),

  coverLetter: z
    .string()
    .trim()
    .min(80, "Xat kamida 80 belgi bo'lsin — mijozga nima qilishingizni tushuntiring")
    .max(3000, "Xat 3000 belgidan oshmasin"),

  amount: moneyField("Taklif summasi"),

  deliveryDays: z.coerce
    .number()
    .int("Kunlar soni butun bo'lsin")
    .min(1, "Kamida 1 kun")
    .max(365, "365 kundan oshmasin"),
});

export const acceptProposalSchema = z.object({
  proposalId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Ish jarayoni
// ─────────────────────────────────────────────────────────────────────────────

export const deliverProjectSchema = z.object({
  projectId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(10, "Nima topshirilayotganini qisqacha yozing")
    .max(2000),
});

export const requestRevisionSchema = z.object({
  projectId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(20, "Nimani tuzatish kerakligini aniq yozing")
    .max(2000),
});

export const approveProjectSchema = z.object({
  projectId: z.string().min(1),
});

export const cancelProjectSchema = z.object({
  projectId: z.string().min(1),
  reason: z.string().trim().min(10, "Bekor qilish sababini yozing").max(500),
});

// ─────────────────────────────────────────────────────────────────────────────
// Hamyon
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hamyonni to'ldirish.
 *
 * Ikki usul:
 *   GATEWAY — CHECKOUT.UZ to'lov sahifasi (karta, Click, Payme).
 *             Pul DARHOL tushadi.
 *   BANK    — bank o'tkazmasi, admin tasdiqlaydi. Shlyuz limitidan
 *             (10 mln so'm) katta summalar uchun kerak.
 */
export const depositSchema = z.object({
  amount: moneyField("Summa"),
  method: z.enum(["GATEWAY", "BANK"]).default("GATEWAY"),
});

export const withdrawSchema = z.object({
  amount: moneyField("Summa"),
  method: z.enum(["CARD", "BANK", "CLICK", "PAYME", "UZUM"]),
  /** Karta raqami yoki hisob — shifrlanib saqlanadi */
  destination: z
    .string()
    .trim()
    .min(8, "Karta yoki hisob raqamini kiriting")
    .max(60),
});
