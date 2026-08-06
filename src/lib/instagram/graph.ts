/**
 * Instagram Graph API mijozi (Instagram Login flow).
 *
 * Barcha chaqiruvlar https://graph.instagram.com ustidan ketadi.
 * Xatolarni IgApiError'ga normallashtiradi — hech qachon ochiq token log qilmaydi.
 */
import {
  IG_GRAPH_BASE,
  IG_GRAPH_ROOT,
  IG_OAUTH_TOKEN,
  getIgConfig,
  getRedirectUri,
} from "./config";
import type { IgProfile, IgMediaItem } from "./types";

export class IgApiError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status = 400, code?: number) {
    super(message);
    this.name = "IgApiError";
    this.status = status;
    this.code = code;
  }
}

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json?.error) {
    const err = json?.error;
    throw new IgApiError(
      err?.message || `Instagram API xatosi (${res.status})`,
      res.status,
      err?.code
    );
  }
  return json;
}

// ─────────────────────────────────────────────
// OAuth: kod → short-lived → long-lived token
// ─────────────────────────────────────────────

/** OAuth kodni short-lived tokenga almashtiradi (+ igUserId) */
export async function exchangeCode(code: string): Promise<{ token: string; userId: string }> {
  const cfg = getIgConfig();
  const body = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code,
  });
  const res = await fetch(IG_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await parse(res);
  // Instagram short-lived javobi: { access_token, user_id, permissions }
  const token = json.access_token as string;
  const userId = String(json.user_id ?? "");
  if (!token) throw new IgApiError("Token olinmadi", 400);
  return { token, userId };
}

/** Short-lived tokenni long-lived (~60 kun) tokenga aylantiradi */
export async function getLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const cfg = getIgConfig();
  const url = `${IG_GRAPH_ROOT}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
    cfg.appSecret
  )}&access_token=${encodeURIComponent(shortToken)}`;
  const res = await fetch(url);
  const json = await parse(res);
  return { token: json.access_token as string, expiresIn: Number(json.expires_in || 5184000) };
}

/** Long-lived tokenni muddati tugashidan oldin yangilaydi (kamida 24 soat yashagan bo'lishi kerak) */
export async function refreshLongLivedToken(token: string): Promise<{ token: string; expiresIn: number }> {
  const url = `${IG_GRAPH_ROOT}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url);
  const json = await parse(res);
  return { token: json.access_token as string, expiresIn: Number(json.expires_in || 5184000) };
}

// ─────────────────────────────────────────────
// Profil va media
// ─────────────────────────────────────────────

export async function getProfile(token: string): Promise<IgProfile> {
  const fields = "user_id,username,name,profile_picture_url,followers_count,follows_count,media_count";
  const url = `${IG_GRAPH_BASE}/me?fields=${fields}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  return parse(res);
}

export async function getMedia(token: string, limit = 24): Promise<IgMediaItem[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count";
  const url = `${IG_GRAPH_BASE}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url);
  const json = await parse(res);
  return (json.data || []) as IgMediaItem[];
}

// ─────────────────────────────────────────────
// Comment javoblari
// ─────────────────────────────────────────────

/** Comment ostiga ochiq (public) javob yozadi */
export async function replyToComment(token: string, commentId: string, message: string): Promise<string> {
  const url = `${IG_GRAPH_BASE}/${commentId}/replies`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const json = await parse(res);
  return String(json.id || "");
}

/** Comment muallifiga shaxsiy javob (private reply) — har comment uchun 1 marta */
export async function sendPrivateReply(token: string, commentId: string, text: string): Promise<string> {
  return sendMessage(token, { comment_id: commentId }, { text });
}

// ─────────────────────────────────────────────
// DM (Messenger Platform for Instagram)
// ─────────────────────────────────────────────

type Recipient = { id: string } | { comment_id: string };

/** Sof matnli DM yuboradi */
export async function sendText(token: string, igsid: string, text: string): Promise<string> {
  return sendMessage(token, { id: igsid }, { text });
}

/** Rasm yoki video biriktirma yuboradi */
export async function sendMediaAttachment(
  token: string,
  igsid: string,
  kind: "image" | "video",
  url: string
): Promise<string> {
  return sendMessage(token, { id: igsid }, {
    attachment: { type: kind, payload: { url } },
  });
}

export type IgOutgoingButton =
  | { type: "web_url"; title: string; url: string }
  | { type: "postback"; title: string; payload: string };

/**
 * Tugmali xabar (button template). Instagram cheklovi: eng ko'pi 3 ta tugma,
 * faqat web_url yoki postback turlari.
 */
export async function sendButtons(
  token: string,
  igsid: string,
  text: string,
  buttons: IgOutgoingButton[]
): Promise<string> {
  return sendMessage(token, { id: igsid }, buildButtonMessage(text, buttons));
}

// ─── Xabar quruvchilar (recipient: id yoki comment_id) ───

export function buildTextMessage(text: string) {
  return { text };
}

export function buildMediaMessage(kind: "image" | "video", url: string) {
  return { attachment: { type: kind, payload: { url } } };
}

export function buildButtonMessage(text: string, buttons: IgOutgoingButton[]) {
  return {
    attachment: {
      type: "template",
      payload: { template_type: "button", text, buttons: buttons.slice(0, 3) },
    },
  };
}

/** Umumiy xabar yuborish (barcha DM/private reply turlari shu orqali) */
export async function sendMessage(token: string, recipient: Recipient, message: unknown): Promise<string> {
  const url = `${IG_GRAPH_BASE}/me/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient, message, access_token: token }),
  });
  const json = await parse(res);
  return String(json.message_id || "");
}
