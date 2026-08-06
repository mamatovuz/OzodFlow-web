/**
 * Instagram Automation konfiguratsiyasi.
 *
 * Bu modul Instagram Platform API (Instagram Login bilan) ustida ishlaydi:
 *   - OAuth: https://www.instagram.com/oauth/authorize
 *   - Graph:  https://graph.instagram.com/{version}
 *
 * Ishga tushirish uchun Meta App (instagram.com/developers) kerak:
 *   IG_APP_ID, IG_APP_SECRET — App Dashboard'dan
 *   IG_WEBHOOK_VERIFY_TOKEN — o'zingiz tanlagan tasodifiy satr (webhook sozlashda)
 *   NEXT_PUBLIC_APP_URL — callback/webhook uchun commit qilingan HTTPS domen
 *
 * Talab qilinadigan ruxsatlar (scopes):
 *   instagram_business_basic
 *   instagram_business_manage_messages
 *   instagram_business_manage_comments
 */

export const IG_GRAPH_VERSION = "v21.0";
export const IG_GRAPH_BASE = `https://graph.instagram.com/${IG_GRAPH_VERSION}`;
export const IG_GRAPH_ROOT = "https://graph.instagram.com";
export const IG_OAUTH_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
export const IG_OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

export function getIgConfig() {
  // "Instagram API with Instagram Login" oqimi uchun client_id/secret =
  // Instagram App ID/Secret (Meta App ID EMAS). IG_APP_* birinchi, bo'lmasa
  // INSTAGRAM_CLIENT_* (muqobil nom) ishlatiladi.
  return {
    appId: process.env.IG_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "",
    appSecret: process.env.IG_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "",
    verifyToken: process.env.IG_WEBHOOK_VERIFY_TOKEN || "",
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  };
}

/** OAuth redirect (callback) manzili — Meta App'da aynan shu ro'yxatga qo'shilishi shart */
export function getRedirectUri() {
  return `${getIgConfig().appUrl}/api/instagram/callback`;
}

/** Sozlanganmi (App ID/Secret bor) — UI ulash tugmasini shunga qarab ko'rsatadi */
export function isIgConfigured() {
  const c = getIgConfig();
  return Boolean(c.appId && c.appSecret);
}
