import { z } from "zod";

/**
 * SERVER ACTION NATIJASI
 *
 * Barcha formalar bir xil shakldagi natija qaytaradi, shunda klient
 * komponentlar bitta mantiq bilan ishlaydi va har formada xato ko'rsatish
 * qaytadan yozilmaydi.
 *
 * Nega `throw` emas: server action ichida tashlangan xato production'da
 * umumiy "An error occurred" xabariga aylanadi — foydalanuvchi nima
 * noto'g'ri bo'lganini bilmaydi. Natija qaytarish esa maydon bo'yicha
 * aniq xabar berish imkonini beradi.
 */

export type FieldErrors = Record<string, string[]>;

export type FormState<T = undefined> =
  | { status: "idle" }
  | { status: "success"; message?: string; data?: T }
  | {
      status: "error";
      /** Umumiy xato (masalan "Login yoki parol xato") */
      message?: string;
      /** Maydon bo'yicha xatolar */
      fieldErrors?: FieldErrors;
    };

export const IDLE: FormState<never> = { status: "idle" };

export function formError(
  message: string,
  fieldErrors?: FieldErrors
): FormState<never> {
  return { status: "error", message, fieldErrors };
}

export function formSuccess<T>(message?: string, data?: T): FormState<T> {
  return { status: "success", message, data };
}

/**
 * Zod xatosini maydon bo'yicha xabarlar obyektiga aylantiradi.
 *
 * `error.flatten()` ATAYLAB ishlatilmadi: Zod 4'da u eskirgan deb
 * belgilangan. `issues` ustida yurish esa versiyalar orasida barqaror.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};

  for (const issue of error.issues) {
    // Ildizdagi xato (masalan parollar mos kelmasligi) uchun "_" kaliti.
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";

    if (!result[key]) result[key] = [];
    result[key].push(issue.message);
  }

  return result;
}

/**
 * `FormData` ni schema bo'yicha tekshiradi.
 *
 * Checkbox'lar alohida ishlanadi: belgilanmagan checkbox FormData'ga
 * UMUMAN TUSHMAYDI (`null` ham emas). Shuning uchun `z.boolean()` ni
 * to'g'ridan-to'g'ri ishlatib bo'lmaydi — `checkbox()` yordamchisi
 * pastda.
 */
export function parseFormData<T>(
  schema: z.ZodType<T>,
  formData: FormData
): { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors } {
  const raw: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    // Fayl maydonlarini o'z holida qoldiramiz.
    if (value instanceof File) {
      raw[key] = value;
      continue;
    }

    // Bir nomdagi bir necha qiymat (ko'p tanlovli) massivga yig'iladi.
    if (key in raw) {
      const existing = raw[key];
      raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      continue;
    }

    raw[key] = value;
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}

/**
 * HTML checkbox uchun schema.
 *
 * Belgilangan checkbox `"on"` (yoki `value` atributi) yuboradi,
 * belgilanmagani esa hech narsa yubormaydi — maydon `undefined` bo'ladi.
 */
export function checkbox() {
  return z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true");
}

/** Bo'sh matnni `undefined` ga aylantiradi — ixtiyoriy maydonlar uchun. */
export function optionalText(maxLength = 500) {
  return z
    .string()
    .trim()
    .max(maxLength, `Maksimal ${maxLength} belgi`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();
}
