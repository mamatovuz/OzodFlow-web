/**
 * OPEN REDIRECT HIMOYASI
 *
 * `?next=` parametri foydalanuvchini kirgandan keyin qaytaradigan manzilni
 * bildiradi. Tekshirilmasa bu klassik zaiflik bo'ladi:
 *
 *   /login?next=https://firibgar-sayt.uz
 *
 * Foydalanuvchi HAQIQIY ozodflow.uz havolasini bosadi, kirishdan keyin esa
 * firibgar saytga tushadi — u yerda "sessiya tugadi, qayta kiring" degan
 * qalbaki forma turadi. Havola bizning domenda bo'lgani uchun odam ishonadi.
 *
 * Shu sababli faqat SAYT ICHIDAGI nisbiy yo'llar qabul qilinadi.
 */

/** Kirgandan keyin standart manzil. */
export const DEFAULT_AFTER_LOGIN = "/dashboard";

/**
 * `next` parametrini tekshiradi. Xavfli bo'lsa standart manzilni qaytaradi.
 *
 * Rad etiladigan holatlar:
 *   • `https://boshqa-sayt.uz`     — mutlaq URL
 *   • `//boshqa-sayt.uz`           — protokolga nisbiy URL (brauzer uni
 *                                    tashqi manzil deb tushunadi)
 *   • `/\boshqa-sayt.uz`           — ba'zi brauzerlar `\` ni `/` deb o'qiydi
 *   • `javascript:alert(1)`        — skript sxemasi
 *   • `/login`, `/register`        — tsikl yaratadi
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN
): string {
  if (!value) return fallback;

  const path = value.trim();

  // Bo'sh yoki `/` bilan boshlanmaydigan — nisbiy yo'l emas.
  if (!path.startsWith("/")) return fallback;

  // `//` va `/\` — tashqi manzilga olib boradi.
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;

  // Boshqarish belgilari — yangi qator orqali HTTP sarlavha inyeksiyasi
  // urinishini yopadi. Escape ko'rinishida: bu belgilar ko'rinmaydi,
  // kodda literal qoldirilsa keyin hech kim tushunmaydi.
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;

  // Auth sahifalariga qaytarish tsikl yaratadi.
  const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];
  if (authPages.some((page) => path === page || path.startsWith(`${page}?`))) {
    return fallback;
  }

  return path;
}

/**
 * Rolga qarab kirgandan keyingi manzil.
 *
 * Adminni mijoz kabinetiga yuborish mantiqsiz — u darhol admin panelga
 * tushishi kerak.
 */
export function defaultLandingForRole(role: string): string {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    case "DEVELOPER":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
