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

// ─── Qulflangan maqola (parol) ───
/** Maqola uchun ochish tokenini yaratadi (cookie'ga yoziladi). */
export async function makeUnlockCookie(postId: string) {
  const token = await new SignJWT({ pid: postId, u: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
  const store = await cookies();
  store.set(`ul_${postId}`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

/** Maqola ochilganmi (parol to'g'ri kiritilganmi) — cookie orqali. */
export async function isPostUnlocked(postId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(`ul_${postId}`)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.pid === postId;
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

/** JSON teg massivini xavfsiz o'qiydi. */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
  } catch {
    return [];
  }
}

/** Teg matnini toza slugga o'xshash ko'rinishga keltiradi (ko'rsatish uchun). */
export function normalizeTag(t: string): string {
  return t.trim().replace(/\s+/g, " ").slice(0, 24);
}

/** O'qish vaqti (daqiqa) — ~200 so'z/daqiqa. */
export function readingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export type TocItem = { id: string; text: string; level: number };

/**
 * Kontent HTML'idagi h2/h3 sarlavhalarga id qo'shadi va mundarija ro'yxatini qaytaradi.
 */
export function buildToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<(h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    if (!text) return m;
    let id = text.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ\s-]/gi, "").replace(/\s+/g, "-").slice(0, 60) || "bolim";
    let base = id, i = 1;
    while (used.has(id)) id = `${base}-${i++}`;
    used.add(id);
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    const cleanAttrs = (attrs || "").replace(/\sid="[^"]*"/i, "");
    return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}

/** Bugungi sana YYYY-MM-DD (server mahalliy). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Kunlik ko'rishlar hisoblagichini oshiradi (dashboard grafigi uchun). */
export async function bumpDailyView() {
  const day = today();
  await prisma.siteDailyStat
    .upsert({ where: { day }, update: { views: { increment: 1 } }, create: { day, views: 1 } })
    .catch(() => {});
}

/**
 * Ommaviy postlar filtri: e'lon qilingan (PUBLIC/SITE) VA sanasi kelgan
 * (rejalashtirilgan — kelajak sanali postlar hali ko'rinmaydi).
 */
export function publicPostWhere() {
  return { status: { in: ["PUBLIC", "SITE"] }, publishDate: { lte: new Date() } };
}

/** Maqola Telegram kanalga yuboriladi (bir marta). */
export async function notifyTelegram(
  post: { title: string; slug: string; excerpt: string },
  link: string,
  token: string,
  channel: string
): Promise<boolean> {
  try {
    const text = `📝 *${escapeMd(post.title)}*\n\n${escapeMd(post.excerpt || "")}\n\n${link}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel, text, parse_mode: "Markdown", disable_web_page_preview: false }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeMd(s: string): string {
  return s.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");
}

/** E'lon qilingan va sanasi kelgan maqolani (bir marta) Telegramга yuboradi. */
export async function maybeNotifyTelegram(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  publishDate: Date;
  tgPosted: boolean;
}) {
  if (post.tgPosted) return;
  if (!(post.status === "PUBLIC" || post.status === "SITE")) return;
  if (new Date(post.publishDate) > new Date()) return; // rejalashtirilgan — hali emas
  const s = await getSiteSetting();
  if (!s.tgBotToken || !s.tgChannel) return;
  const [origin, base] = await Promise.all([siteOrigin(), siteBase()]);
  const okSent = await notifyTelegram(
    { title: post.title, slug: post.slug, excerpt: post.excerpt },
    `${origin}${base}/blog/${post.slug}`,
    s.tgBotToken,
    s.tgChannel
  );
  if (okSent) await prisma.sitePost.update({ where: { id: post.id }, data: { tgPosted: true } }).catch(() => {});
}

/**
 * Sanasi kelgan, e'lon qilingan, lekin Telegramга hali yuborilmagan postlarni
 * kanalga tashlaydi (sekin-cron: sahifa ochilganda ishga tushadi).
 */
export async function publishDuePosts(origin: string, base: string) {
  const s = await getSiteSetting();
  if (!s.tgBotToken || !s.tgChannel) return;
  const due = await prisma.sitePost.findMany({
    where: { status: { in: ["PUBLIC", "SITE"] }, publishDate: { lte: new Date() }, tgPosted: false },
    take: 5,
  });
  for (const p of due) {
    const ok = await notifyTelegram(
      { title: p.title, slug: p.slug, excerpt: p.excerpt },
      `${origin}${base}/blog/${p.slug}`,
      s.tgBotToken,
      s.tgChannel
    );
    if (ok) await prisma.sitePost.update({ where: { id: p.id }, data: { tgPosted: true } }).catch(() => {});
  }
}

/** Postdan qisqacha matn (HTML teglarsiz). */
export function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
