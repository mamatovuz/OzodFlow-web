import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/auth/tokens";

/**
 * Auth cookie'lari.
 *
 * Ikkalasi ham `httpOnly` — JavaScript ularni O'QIY OLMAYDI. Bu XSS'ga
 * qarshi asosiy himoya: sahifaga begona skript kirsa ham tokenni
 * o'g'irlay olmaydi. Shu sababli tokenlar `localStorage` da
 * SAQLANMAYDI — u JS uchun ochiq.
 *
 * `sameSite: "lax"` — cross-site POST so'rovlarida cookie yuborilmaydi
 * (CSRF himoyasi), lekin tashqi havoladan saytga kirganda ishlaydi.
 * `strict` qo'ysak, Telegram yoki emaildagi havoladan kelgan foydalanuvchi
 * har safar chiqib qolgandek ko'rinardi.
 */

export const ACCESS_COOKIE = "ozf_at";
export const REFRESH_COOKIE = "ozf_rt";

/** Production'da `secure` — cookie faqat HTTPS orqali yuboriladi. */
const isProduction = process.env.NODE_ENV === "production";

export type AuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

/**
 * Cookie sozlamalari.
 *
 * Eksport qilinadi, chunki route handler'lar cookie'ni `NextResponse`
 * obyektiga TO'G'RIDAN-TO'G'RI yozadi — redirect javobida `cookies()`
 * orqali yozish har doim ishonchli ishlamaydi.
 */
export function authCookieOptions(maxAge: number): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

const baseOptions = authCookieOptions;

export const ACCESS_COOKIE_MAX_AGE = ACCESS_TOKEN_TTL_SECONDS;
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_TTL_SECONDS;

export async function setAuthCookies(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_COOKIE, tokens.accessToken, baseOptions(ACCESS_TOKEN_TTL_SECONDS));
  store.set(REFRESH_COOKIE, tokens.refreshToken, baseOptions(REFRESH_TOKEN_TTL_SECONDS));
}

/**
 * Faqat access tokenni yangilaydi.
 * Refresh tokenni ham yangilash kerak bo'lsa `setAuthCookies` ishlatiladi.
 */
export async function setAccessCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, baseOptions(ACCESS_TOKEN_TTL_SECONDS));
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();

  // `maxAge: 0` — brauzer cookie'ni darhol o'chiradi.
  store.set(ACCESS_COOKIE, "", baseOptions(0));
  store.set(REFRESH_COOKIE, "", baseOptions(0));
}

export async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value || null;
}

export async function readRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value || null;
}
