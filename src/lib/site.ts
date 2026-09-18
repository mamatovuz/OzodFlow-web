// Shaxsiy sayt (Ozodbek's Blog) — yordamchi funksiyalar.
// OzodFlow admin tizimidan MUSTAQIL: alohida cookie, alohida login.
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import {
  emailConfigured,
  sendEmail,
  newPostEmail,
  welcomeEmail,
  commentReplyEmail,
  newCommentAdminEmail,
} from "./email";

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
/** Joriy so'rovning haqiqiy hosti — proxy orqasida `x-forwarded-host` ustun. */
function effectiveHost(hdrs: Headers): string {
  const raw = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
  return raw.split(",")[0].split(":")[0].trim().toLowerCase();
}

export async function siteBase(): Promise<string> {
  const hdrs = await headers();
  const host = effectiveHost(hdrs);
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
  // Proxy orqasida haqiqiy domen `x-forwarded-host`da bo'lishi mumkin
  const host = (hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000").split(",")[0].trim();
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Kanonik manzil (Telegram/email havolalari uchun). Admin panelda `siteUrl`
 * kiritilgan bo'lsa — o'sha (masalan https://vizidka.uz), aks holda so'rov domeni.
 * Shu tufayli botga tashlangan havola railway domeni emas, haqiqiy domen bo'ladi.
 */
export function canonicalFrom(
  s: { siteUrl?: string | null },
  reqOrigin: string,
  reqBase: string
): { origin: string; base: string } {
  const u = (s.siteUrl || "").trim().replace(/\/+$/, "");
  if (u) return { origin: /^https?:\/\//i.test(u) ? u : `https://${u}`, base: "" };
  return { origin: reqOrigin, base: reqBase };
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

// ─── Emoji reaksiyalar ───
export const REACTIONS = ["heart", "fire", "idea", "wow", "clap"] as const;
export type ReactionKey = (typeof REACTIONS)[number];

/** SitePost.reactions (JSON) ni xavfsiz {kalit: son} obyektiga aylantiradi. */
export function parseReactions(raw: string | null | undefined): Record<ReactionKey, number> {
  const out = { heart: 0, fire: 0, idea: 0, wow: 0, clap: 0 };
  try {
    const o = JSON.parse(raw || "{}");
    for (const k of REACTIONS) out[k] = Math.max(0, Math.floor(Number(o?.[k]) || 0));
  } catch {
    /* bo'sh — nol qoladi */
  }
  return out;
}

/** Reaksiyalar yig'indisi. */
export function reactionsTotal(raw: string | null | undefined): number {
  const r = parseReactions(raw);
  return REACTIONS.reduce((s, k) => s + r[k], 0);
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

/** Teg matnini Telegram hashtagiga aylantiradi (#soz). Yaroqsiz bo'lsa "". */
function tgHashtag(tag: string): string {
  const clean = tag
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return clean ? `#${clean}` : "";
}

/** Telegram HTML parse_mode uchun xavfsiz matn. */
function escTg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Maqolani Telegram kanalga chiroyli formatda yuboradi (bir marta):
 * muqova rasm (bo'lsa), sarlavha, qisqacha, o'qish vaqti, hashtag teglar va
 * "Maqolani o'qish" tugmasi. HTML parse_mode ishlatiladi.
 */
export async function notifyTelegram(
  post: {
    title: string;
    excerpt: string;
    coverImage?: string | null; // ABSOLUT URL bo'lishi kerak
    tags?: string;
    contentHtml?: string;
  },
  link: string,
  token: string,
  channel: string
): Promise<boolean> {
  try {
    const mins = post.contentHtml ? readingTime(post.contentHtml) : 0;
    const tags = parseTags(post.tags).slice(0, 4).map(tgHashtag).filter(Boolean);

    const parts: string[] = [`📝 <b>${escTg(post.title)}</b>`];
    const excerpt = (post.excerpt || "").trim();
    if (excerpt) parts.push("", escTg(excerpt));
    if (mins) parts.push("", `🕒 ${mins} daqiqalik o'qish`);
    if (tags.length) parts.push("", tags.join(" "));
    const caption = parts.join("\n");

    const reply_markup = { inline_keyboard: [[{ text: "🔗 Maqolani o'qish", url: link }]] };
    const api = (m: string) => `https://api.telegram.org/bot${token}/${m}`;
    const hdrs = { "Content-Type": "application/json" };

    // Muqova rasm bo'lsa — sendPhoto (caption limiti ~1024)
    if (post.coverImage && /^https?:\/\//i.test(post.coverImage)) {
      const cap = caption.length > 1000 ? caption.slice(0, 1000) + "…" : caption;
      const res = await fetch(api("sendPhoto"), {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ chat_id: channel, photo: post.coverImage, caption: cap, parse_mode: "HTML", reply_markup }),
      });
      if (res.ok) return true;
      // Rasm URL yaroqsiz bo'lsa — matnli xabarga qaytamiz
    }

    const text = `${caption}\n\n${link}`;
    const res = await fetch(api("sendMessage"), {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify({ chat_id: channel, text, parse_mode: "HTML", disable_web_page_preview: false, reply_markup }),
    });
    return res.ok;
  } catch {
    return false;
  }
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
  coverImage?: string | null;
  tags?: string;
  contentHtml?: string;
}) {
  if (post.tgPosted) return;
  if (!(post.status === "PUBLIC" || post.status === "SITE")) return;
  if (new Date(post.publishDate) > new Date()) return; // rejalashtirilgan — hali emas
  const s = await getSiteSetting();
  if (!s.tgBotToken || !s.tgChannel) return;
  const [reqOrigin, reqBase] = await Promise.all([siteOrigin(), siteBase()]);
  const { origin, base } = canonicalFrom(s, reqOrigin, reqBase);
  const okSent = await notifyTelegram(
    {
      title: post.title,
      excerpt: post.excerpt,
      coverImage: absUrl(origin, post.coverImage),
      tags: post.tags,
      contentHtml: post.contentHtml,
    },
    `${origin}${base}/blog/${post.slug}`,
    s.tgBotToken,
    s.tgChannel
  );
  if (okSent) await prisma.sitePost.update({ where: { id: post.id }, data: { tgPosted: true } }).catch(() => {});
}

/** Obunani bekor qilish tokeni (email uchun HMAC — parolsiz, ishonchli). */
export function subscribeToken(email: string): string {
  const secret = (process.env.JWT_SECRET || "ozodflow-dev-secret-change-me") + "::unsub";
  return crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 20);
}

/** Obunani bekor qilish tokenini tekshiradi. */
export function verifySubscribeToken(email: string, token: string): boolean {
  const expected = subscribeToken(email);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Obunani bekor qilish havolasi (kanonik domenda). */
function unsubUrl(origin: string, email: string): string {
  return `${origin}/api/site/unsubscribe?e=${encodeURIComponent(email)}&t=${subscribeToken(email)}`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Yangi e'lon qilingan maqola haqida obunachilarga email yuboradi (bir marta). */
export async function maybeEmailSubscribers(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  publishDate: Date;
  emailed: boolean;
  coverImage?: string | null;
  contentHtml?: string;
}) {
  if (post.emailed) return;
  if (!(post.status === "PUBLIC" || post.status === "SITE")) return;
  if (new Date(post.publishDate) > new Date()) return;
  if (!emailConfigured()) return;

  const [subs, s, reqOrigin, reqBase] = await Promise.all([
    prisma.siteSubscriber.findMany({ select: { email: true } }),
    getSiteSetting(),
    siteOrigin(),
    siteBase(),
  ]);
  if (subs.length === 0) return;

  const { origin, base } = canonicalFrom(s, reqOrigin, reqBase);
  const link = `${origin}${base}/blog/${post.slug}`;
  const cover = absUrl(origin, post.coverImage);
  const minutes = post.contentHtml ? readingTime(post.contentHtml) : undefined;

  // Ketma-ket yuboramiz (shaxsiy blog uchun yetarli), har biriga shaxsiy unsubscribe
  for (const sub of subs) {
    const { subject, html } = newPostEmail({
      brand: s.siteName,
      title: escHtml(post.title),
      excerpt: escHtml(post.excerpt || ""),
      coverImage: cover,
      minutes,
      link,
      unsubscribeUrl: unsubUrl(origin, sub.email),
    });
    await sendEmail({ to: sub.email, subject, html }).catch(() => {});
  }
  await prisma.sitePost.update({ where: { id: post.id }, data: { emailed: true } }).catch(() => {});
}

/** Muallif (admin) izohga javob berganda — izoh egasining emailiga xabar. */
export async function notifyCommentReply(
  parent: { email?: string | null; name: string },
  post: { title: string; slug: string },
  replyBody: string
) {
  if (!parent.email || !emailConfigured()) return;
  const [s, reqOrigin, reqBase] = await Promise.all([getSiteSetting(), siteOrigin(), siteBase()]);
  const { origin, base } = canonicalFrom(s, reqOrigin, reqBase);
  const { subject, html } = commentReplyEmail({
    brand: s.siteName,
    name: escHtml(parent.name),
    postTitle: escHtml(post.title),
    replyBody: escHtml(replyBody),
    link: `${origin}${base}/blog/${post.slug}`,
  });
  await sendEmail({ to: parent.email, subject, html }).catch(() => {});
}

/** Yangi izoh kelganda — adminga (moderatsiya) xabar. */
export async function notifyAdminNewComment(
  comment: { name: string; body: string },
  post: { title: string; slug: string },
  isReply: boolean
) {
  if (!emailConfigured()) return;
  const [s, reqOrigin, reqBase] = await Promise.all([getSiteSetting(), siteOrigin(), siteBase()]);
  const { origin, base } = canonicalFrom(s, reqOrigin, reqBase);
  const { subject, html } = newCommentAdminEmail({
    brand: s.siteName,
    name: escHtml(comment.name),
    body: escHtml(comment.body),
    postTitle: escHtml(post.title),
    link: `${origin}${base}/panel`,
    isReply,
  });
  await sendEmail({ to: SITE_ADMIN_EMAIL, subject, html }).catch(() => {});
}

/** Yangi obunachiga xush kelibsiz xatini yuboradi (fon rejimida). */
export async function sendWelcomeEmail(email: string) {
  if (!emailConfigured()) return;
  const [s, reqOrigin, reqBase] = await Promise.all([getSiteSetting(), siteOrigin(), siteBase()]);
  const { origin, base } = canonicalFrom(s, reqOrigin, reqBase);
  const { subject, html } = welcomeEmail({
    brand: s.siteName,
    blogUrl: `${origin}${base}/blog`,
    unsubscribeUrl: unsubUrl(origin, email),
  });
  await sendEmail({ to: email, subject, html }).catch(() => {});
}

/** O'xshash maqolalar: umumiy teglar soni bo'yicha (fallback — eng yangilari). */
export function pickRelated<T extends { id: string; tags: string }>(
  current: { id: string; tags: string },
  pool: T[],
  take = 3
): T[] {
  const curTags = new Set(parseTags(current.tags));
  const scored = pool
    .filter((p) => p.id !== current.id)
    .map((p) => ({ p, score: parseTags(p.tags).filter((t) => curTags.has(t)).length }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, take).map((x) => x.p);
}

/**
 * Sanasi kelgan, e'lon qilingan, lekin Telegramга hali yuborilmagan postlarni
 * kanalga tashlaydi (sekin-cron: sahifa ochilganda ishga tushadi).
 */
export async function publishDuePosts(_origin: string, _base: string) {
  // Rejalashtirilgan sanasi kelgan, lekin hali xabar berilmagan postlar
  const due = await prisma.sitePost.findMany({
    where: {
      status: { in: ["PUBLIC", "SITE"] },
      publishDate: { lte: new Date() },
      OR: [{ tgPosted: false }, { emailed: false }],
    },
    take: 5,
  });
  for (const p of due) {
    await maybeNotifyTelegram(p).catch(() => {});
    await maybeEmailSubscribers(p).catch(() => {});
  }
}

/** Postdan qisqacha matn (HTML teglarsiz). */
export function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
