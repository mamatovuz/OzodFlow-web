import crypto from "crypto";

/**
 * Qurilma aniqlash — userAgent'dan qurilma turi, OS, brauzer va inson o'qiy
 * oladigan yorliq (label) chiqaradi. "Faol seanslar" ro'yxatida va bloklashda
 * ishlatiladi. Sof heuristika — tashqi kutubxona kerak emas.
 */

export type DeviceType = "phone" | "tablet" | "laptop" | "desktop" | "unknown";

export type ParsedDevice = {
  type: DeviceType;
  os: string; // "iOS", "Android", "Windows", "macOS", "Linux"
  browser: string; // "Safari", "Chrome", "Firefox", ...
  label: string; // "iPhone", "Android telefon", "Windows noutbuk" ...
  icon: DeviceType; // UI ikonka kaliti (type bilan bir xil)
};

export function parseUserAgent(ua?: string | null): ParsedDevice {
  const s = (ua || "").toLowerCase();

  if (!s) {
    return { type: "unknown", os: "Noma'lum", browser: "Noma'lum", label: "Noma'lum qurilma", icon: "unknown" };
  }

  // ── OS ──
  let os = "Noma'lum";
  const isIpad = /ipad/.test(s) || (/macintosh/.test(s) && /mobile/.test(s));
  if (/iphone|ipod/.test(s)) os = "iOS";
  else if (isIpad) os = "iPadOS";
  else if (/android/.test(s)) os = "Android";
  else if (/windows/.test(s)) os = "Windows";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";
  else if (/cros/.test(s)) os = "ChromeOS";

  // ── Brauzer (tartib muhim: Edge/Opera Chrome'ni o'z ichiga oladi) ──
  let browser = "Brauzer";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/samsungbrowser/.test(s)) browser = "Samsung Internet";
  else if (/firefox|fxios/.test(s)) browser = "Firefox";
  else if (/chrome|crios/.test(s)) browser = "Chrome";
  else if (/safari/.test(s)) browser = "Safari";
  else if (/telegram/.test(s)) browser = "Telegram";

  // ── Qurilma turi ──
  let type: DeviceType = "desktop";
  if (/iphone|ipod/.test(s)) type = "phone";
  else if (isIpad || /tablet/.test(s)) type = "tablet";
  else if (/android/.test(s)) type = /mobile/.test(s) ? "phone" : "tablet";
  else if (/mobile/.test(s)) type = "phone";
  else if (os === "macOS" || os === "Windows" || os === "Linux" || os === "ChromeOS") type = "laptop";

  // ── Inson o'qiy oladigan yorliq ──
  let label: string;
  if (/iphone|ipod/.test(s)) label = "iPhone";
  else if (isIpad) label = "iPad";
  else if (type === "phone") label = "Android telefon";
  else if (type === "tablet") label = "Planshet";
  else if (os === "macOS") label = "Mac";
  else if (os === "Windows") label = "Windows noutbuk";
  else if (os === "Linux") label = "Linux kompyuter";
  else if (os === "ChromeOS") label = "Chromebook";
  else label = "Kompyuter";

  return { type, os, browser, label, icon: type };
}

/**
 * Qurilma barmoq izi — bir xil userAgent'ni barqaror qisqa hash'ga aylantiradi.
 * Bloklash shu izga qarab ishlaydi (aynan bir xil qurilma/brauzer qayta kira olmaydi).
 * Coarse fingerprint: bir xil telefon modeli + brauzer = bir iz (MVP uchun yetarli).
 */
export function deviceFingerprint(ua?: string | null): string {
  const base = (ua || "unknown").trim();
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24);
}
