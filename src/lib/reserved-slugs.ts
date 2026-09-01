// Root darajadagi ariza (landing) sahifalari `ozodflow.uz/<slug>` da ochiladi.
// Bu slug'lar mavjud sahifa/route yo'llari bilan to'qnashmasligi kerak.
// Next.js statik route'larni birinchi hal qiladi, lekin himoya uchun bu ro'yxatni
// ham slug validatsiyasida, ham [slug] catch-all'da ishlatamiz.
export const RESERVED_SLUGS = new Set<string>([
  "admins",
  "app",
  "dashboard",
  "data-deletion",
  "m",
  "media",
  "privacy",
  "receipt",
  "staff",
  "terms",
  "blog",
  "r",
  "login",
  "register",
  "api",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "favicon.ico",
  "ariza",
]);

/** slug root darajada ishlatilishi mumkinmi (band emasmi). */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
