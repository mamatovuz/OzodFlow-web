// ─────────────────────────────────────────────
// Google bilan kirish (OAuth 2.0) — yordamchi funksiyalar.
//
// Oqim: /api/auth/google → Google roziligi → /api/auth/google/callback.
// next-auth ishlatmaymiz — loyihaning o'z JWT sessiyasiga mos qo'lda yozildi.
// ─────────────────────────────────────────────

import type { NextRequest } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_STATE_COOKIE = "ozf_google_state";
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * So'rov kelgan haqiqiy origin (protokol + host). Proksi (Railway/Vercel)
 * ortida x-forwarded-* sarlavhalaridan olinadi — shu tufayli lokal
 * (localhost:3000) va prod (ozodflow.uz) da bir xil ishlaydi.
 * OAUTH_ORIGIN env berilsa — u ustun (majburiy override).
 */
export function requestOrigin(req: NextRequest): string {
  const override = process.env.OAUTH_ORIGIN;
  if (override) return override.replace(/\/+$/, "");
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    req.nextUrl.protocol.replace(":", "") ||
    "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    req.headers.get("host") ||
    req.nextUrl.host;
  return `${proto}://${host}`;
}

export function redirectUri(req: NextRequest): string {
  return `${requestOrigin(req)}${GOOGLE_CALLBACK_PATH}`;
}

/** Google rozilik sahifasi manzilini quradi. */
export function buildAuthUrl(req: NextRequest, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

/** Kodni tokenga almashtirib, foydalanuvchi profilini oladi. Xatoда null. */
export async function exchangeCodeForProfile(
  req: NextRequest,
  code: string
): Promise<GoogleProfile | null> {
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(req),
      }),
    });
    if (!tokenRes.ok) return null;
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return null;

    const infoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      picture?: string;
    };
    if (!info.sub) return null;

    return {
      sub: info.sub,
      email: info.email ? info.email.trim().toLowerCase() : null,
      emailVerified: Boolean(info.email_verified),
      name: (info.name || info.given_name || "Foydalanuvchi").trim().slice(0, 100),
      picture: info.picture || null,
    };
  } catch {
    return null;
  }
}
