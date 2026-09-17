// Shaxsiy sayt (Ozodbek's Blog) — yordamchi funksiyalar.
// OzodFlow admin tizimidan MUSTAQIL: alohida cookie, alohida login.
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

// ─── Kirish ma'lumotlari ───
export const SITE_ADMIN_EMAIL = "mamatovo354@gmail.com";
export const SITE_ADMIN_PASSWORD = "123@Ozod";

const COOKIE = "ozod_site_session";
const SESSION_DAYS = 30;

// Blog post holatlari
export const SITE_STATUS = {
  DRAFT: "DRAFT", // qoralama — hech kimga ko'rinmaydi
  PUBLIC: "PUBLIC", // hammaga — /blog ro'yxatida
  SITE: "SITE", // bosh sahifada ham ajratib ko'rsatiladi
} as const;
export type SiteStatus = keyof typeof SITE_STATUS;

let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.JWT_SECRET || "ozodflow-dev-secret-change-me";
  cachedSecret = new TextEncoder().encode(s + "::site");
  return cachedSecret;
}

export async function createSiteSession() {
  const token = await new SignJWT({ role: "site-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSiteSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Shaxsiy sayt admini kirganmi (server komponent / API uchun). */
export async function isSiteAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "site-admin";
  } catch {
    return false;
  }
}

/**
 * Sahifa yo'llari uchun asos (prefix).
 * - Shaxsiy domenda (PERSONAL_SITE_HOST) so'rov kelsa: "" → `/blog`, `/about` ...
 * - Asosiy OzodFlow domenida sinash uchun: "/site" → `/site/blog` ...
 */
export async function siteBase(): Promise<string> {
  const hdrs = await headers();
  const host = (hdrs.get("host") || "").split(":")[0].toLowerCase();
  const siteHosts = (process.env.PERSONAL_SITE_HOST || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return siteHosts.includes(host) ? "" : "/site";
}

// Boshlang'ich "Men haqimda" matni (admin paneldan tahrirlanadi).
const DEFAULT_ABOUT_HTML = `<p>Salom, mening ismim <strong>Ozodbek</strong>. Men <strong>Andijon</strong>likman va hozirda dasturlashni chuqur o‘rganib kelmoqdaman. <strong>Frontend</strong> yo‘nalishini tugatib, hozir <strong>Backend</strong> tomon qadam qo‘yyapman.</p>
<p>Hozirgi kunda ko‘pchilik <strong>AI sabab dasturchilarga ish qolmaydi</strong> deydi. Lekin men bunga boshqacha qarayman. Shuning uchun blogimning asosiy g‘oyasi: <strong>"Raqamli dunyoda raqamsiz narsalar haqida gaplashamiz"</strong>.</p>
<p>Oddiy qilib aytganda, hamma texnologiya haqida gapirayotgan paytda, biz insoniylik, fikrlash, odatlar va hayotiy qarashlar haqida ham suhbatlashamiz. Bu — biroz boshqacha yondashuv.</p>`;

// Boshlang'ich ijtimoiy havolalar (admin paneldan qo'shiladi/o'chiriladi).
const DEFAULT_LINKS = JSON.stringify([
  { id: "l1", icon: "youtube", url: "https://www.youtube.com/@mamatov_ads", label: "YouTube" },
  { id: "l2", icon: "github", url: "https://www.github.com/mamatovuz", label: "GitHub" },
  { id: "l3", icon: "linkedin", url: "https://www.linkedin.com/in/mamatovozodbek/", label: "LinkedIn" },
  { id: "l4", icon: "telegram", url: "https://t.me/Mamatov_ads", label: "Telegram" },
]);

export type SiteLink = { id: string; icon: string; url: string; label?: string };
export type SiteNavButton = { id: string; label: string; url: string; external?: boolean };

/** SiteSetting.navButtons (JSON) ni xavfsiz massivga aylantiradi. */
export function parseNavButtons(raw: string | null | undefined): SiteNavButton[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.url === "string" && typeof x.label === "string")
      .map((x, i) => ({
        id: String(x.id || `n${i}`),
        label: String(x.label),
        url: String(x.url),
        external: !!x.external,
      }));
  } catch {
    return [];
  }
}

/** Joriy so'rov manzili (https://host) — absolut OG/rasm URL uchun. */
export async function siteOrigin(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Nisbiy (/media/..) yoki absolut URL'ni absolutga aylantiradi. */
export function absUrl(origin: string, url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** SiteSetting.links (JSON) ni xavfsiz massivga aylantiradi. */
export function parseLinks(raw: string | null | undefined): SiteLink[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.url === "string")
      .map((x, i) => ({
        id: String(x.id || `l${i}`),
        icon: String(x.icon || "link"),
        url: String(x.url),
        label: x.label ? String(x.label) : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * Sozlamalarni oladi; bo'lmasa atomik yaratadi (upsert — bir vaqtda kelgan
 * so'rovlarda P2002 bo'lmaydi).
 */
export async function getSiteSetting() {
  const s = await prisma.siteSetting.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", aboutHtml: DEFAULT_ABOUT_HTML, links: DEFAULT_LINKS },
  });
  // Eski qator (links ustuni keyin qo'shilgan) — bir marta standart havolalar bilan to'ldiramiz.
  if (!s.links || s.links === "[]") {
    return prisma.siteSetting.update({ where: { id: "main" }, data: { links: DEFAULT_LINKS } });
  }
  return s;
}

/** Postdan qisqacha matn (HTML teglarsiz). */
export function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
