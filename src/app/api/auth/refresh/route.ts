import { NextResponse, type NextRequest } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  authCookieOptions,
} from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { rotateSession } from "@/lib/auth/session";
import { getRequestInfo } from "@/lib/request-info";

/**
 * TOKENNI YANGILASH
 *
 * Middleware access token muddati tugaganini ko'rsa shu manzilga yuboradi.
 * Bu yerda rotatsiya bajariladi va foydalanuvchi o'zi ketayotgan sahifaga
 * qaytariladi — u hech narsa sezmaydi.
 *
 * Nega middleware'ning o'zida emas: rotatsiya databasega YOZISHNI talab
 * qiladi (eski sessiyani bekor qilish, yangisini yaratish), middleware esa
 * Edge runtime'da ishlaydi va Prisma u yerda ishlamaydi.
 *
 * `runtime = "nodejs"` ataylab aniq yozilgan: bu standart qiymat, lekin
 * kimdir uni "tezroq bo'ladi" deb `edge` ga o'zgartirsa Prisma darhol
 * ishlamay qoladi.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest): Promise<NextResponse> {
  const nextPath = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  /** Cookie'larni tozalab kirish sahifasiga yuboradi. */
  function toLogin(reason?: string): NextResponse {
    const loginUrl = new URL("/login", request.url);
    if (nextPath) loginUrl.searchParams.set("next", nextPath);
    if (reason) loginUrl.searchParams.set("reason", reason);

    const response = NextResponse.redirect(loginUrl);

    // Yaroqsiz cookie'lar qolib ketmasligi kerak — aks holda middleware
    // yana shu manzilga yuboradi va tsikl paydo bo'ladi.
    response.cookies.set(ACCESS_COOKIE, "", authCookieOptions(0));
    response.cookies.set(REFRESH_COOKIE, "", authCookieOptions(0));

    return response;
  }

  if (!refreshToken) return toLogin();

  const info = await getRequestInfo();
  const result = await rotateSession(refreshToken, {
    ip: info.ip,
    userAgent: info.userAgent,
  });

  switch (result.status) {
    case "ok": {
      const response = NextResponse.redirect(new URL(nextPath, request.url));

      response.cookies.set(
        ACCESS_COOKIE,
        result.tokens.accessToken,
        authCookieOptions(ACCESS_COOKIE_MAX_AGE)
      );
      response.cookies.set(
        REFRESH_COOKIE,
        result.tokens.refreshToken,
        authCookieOptions(REFRESH_COOKIE_MAX_AGE)
      );

      return response;
    }

    /**
     * Parallel so'rov: token boshqa so'rov tomonidan hozirgina
     * yangilangan.
     *
     * Cookie'ga TEGILMAYDI — brauzerda allaqachon yangi qiymat bor
     * (g'olib so'rov o'rnatgan). Shunchaki maqsadga yo'naltiramiz va
     * keyingi so'rov yangi token bilan ketadi.
     */
    case "raced":
      return NextResponse.redirect(new URL(nextPath, request.url));

    case "reuse_detected":
      // Barcha sessiyalar `rotateSession` ichida yopildi. Foydalanuvchiga
      // sabab ko'rsatiladi — u parolini o'zgartirishi kerak bo'lishi mumkin.
      return toLogin("security");

    case "user_blocked":
      return toLogin("blocked");

    default:
      return toLogin();
  }
}

/** Middleware redirect qilganda GET keladi. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

/** Klient kodi o'zi yangilashni so'rasa POST ishlatiladi. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
