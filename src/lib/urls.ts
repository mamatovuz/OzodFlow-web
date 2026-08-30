// Menyu manzillari — subdomen ko'rinishida (masalan: test.ozodflow.uz).
// Bitta joyda saqlanadi: QR kod, sozlamalar, havolalar shu yerdan foydalanadi.

// Asosiy domen (env orqali o'zgartirsa bo'ladi). Protokol/oxirgi slash olib tashlanadi.
export const BASE_DOMAIN = (
  process.env.NEXT_PUBLIC_BASE_DOMAIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "ozodflow.uz"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

// Subdomen sifatida ishlatib bo'lmaydigan nomlar (marshrutlar bilan to'qnashmasin)
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "admins",
  "staff",
  "dashboard",
  "m",
  "media",
  "cdn",
  "mail",
  "static",
]);

// Menyuning commonda ko'rinadigan hosti: subdomen yoki maxsus domen
export function menuHost(slug: string, customDomain?: string | null): string {
  if (customDomain) return customDomain;
  return `${slug}.${BASE_DOMAIN}`;
}

// Menyuning to'liq https manzili (QR, havola uchun)
export function menuUrl(slug: string, customDomain?: string | null): string {
  return `https://${menuHost(slug, customDomain)}`;
}

// Host (masalan "test.ozodflow.uz") dan slug ajratib olish.
// Asosiy domen yoki www bo'lsa — null (bu menyu subdomeni emas, platformaning o'zi).
export function slugFromHost(host: string): string | null {
  const h = host.split(":")[0].toLowerCase().trim();
  if (!h || h === BASE_DOMAIN || h === `www.${BASE_DOMAIN}`) return null;
  if (!h.endsWith(`.${BASE_DOMAIN}`)) return null; // maxsus (custom) domen — bu emas
  const sub = h.slice(0, -1 * (`.${BASE_DOMAIN}`.length));
  if (!sub || sub.includes(".")) return null; // ko'p bosqichli subdomen — qo'llab-quvvatlanmaydi
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}
