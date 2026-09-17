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

/** Sozlamalarni oladi; bo'lmasa yaratadi (bitta qator, id="main"). */
export async function getSiteSetting() {
  const existing = await prisma.siteSetting.findUnique({ where: { id: "main" } });
  if (existing) return existing;
  return prisma.siteSetting.create({ data: { id: "main", aboutHtml: DEFAULT_ABOUT_HTML } });
}

/** Postdan qisqacha matn (HTML teglarsiz). */
export function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
