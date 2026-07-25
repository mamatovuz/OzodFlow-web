import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { ROLE_RANK, UserRole } from "@/lib/enums";

/**
 * MIDDLEWARE
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  IKKI VAZIFA
 *
 *  1. Content-Security-Policy — har so'rovga nonce bilan.
 *  2. Himoyalangan yo'llarni tekshirish (arzon, stateless).
 *
 *  MUHIM: bu kod Edge runtime'da ishlaydi va DATABASEGA TEGMAYDI —
 *  Edge'da Prisma ishlamaydi. Shu sababli u faqat tokenning IMZOSI va
 *  MUDDATINI tekshiradi.
 *
 *  Bu YETARLI EMAS va yetarli bo'lishi ham kerak emas: haqiqiy ruxsat
 *  server komponentlarida `requireUser`/`requireAdmin` orqali beriladi,
 *  u yerda hisob holati va roli databasedan qayta o'qiladi. Middleware
 *  faqat birinchi filtr — kirmagan odamni kirish sahifasiga yuboradi.
 *
 *  Nega shunday: agar rol faqat tokenga qarab berilsa, admin roli tortib
 *  olingan foydalanuvchi eski token bilan 15 daqiqa admin panelda
 *  qolishi mumkin edi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Kirish talab qilinadigan yo'l boshlanmalari. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/wallet",
  "/messages",
  "/settings",
  "/my-projects",
  "/proposals",
  "/apply/test",
  "/apply/status",
];

/** Admin roli talab qilinadigan yo'llar. */
const ADMIN_PREFIXES = ["/admin"];

/** Kirgan foydalanuvchi ko'rmasligi kerak bo'lgan yo'llar (kirish/ro'yxat). */
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * CSP nonce yasaydi.
 *
 * Har so'rovda YANGI qiymat bo'lishi shart. Bir xil nonce qayta
 * ishlatilsa, hujumchi uni bilib olib o'z skriptiga yozib qo'yadi va
 * CSP ma'nosini yo'qotadi.
 */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Content-Security-Policy.
 *
 * `'strict-dynamic'` — nonce bilan ruxsat berilgan skript o'zi yuklagan
 * skriptlarga ham ishonadi. Next.js chunk'larni dinamik yuklaydi, shu
 * direktiva bo'lmasa har chunk uchun alohida ruxsat kerak bo'lardi.
 *
 * Dev rejimida `'unsafe-eval'` qo'shiladi: Turbopack HMR eval ishlatadi.
 * Production'da u YO'Q.
 */
function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    isDev ? `'unsafe-eval'` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Tailwind va next/font inline uslub yozadi — nonce ularga yetib
    // bormaydi, shuning uchun 'unsafe-inline' shart. Uslub orqali
    // hujum imkoniyati skriptga qaraganda ancha cheklangan.
    `style-src 'self' 'unsafe-inline'`,
    // next/font shriftlarni o'z domenimizga yuklab beradi.
    `font-src 'self' data:`,
    // Rasm: o'zimiz + data URI (inline SVG) + blob (yuklashdan oldingi
    // ko'rinish) + https (developer avatarlari, S3/CDN).
    `img-src 'self' data: blob: https:`,
    `connect-src 'self'`,
    // Loyiha fayllari (video/audio) S3'dan kelishi mumkin.
    `media-src 'self' https:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Formani boshqa domenga yuborib bo'lmaydi — ma'lumot o'g'irlashning
    // oddiy yo'lini yopadi.
    `form-action 'self'`,
    // Saytni iframe ichiga joylab bo'lmaydi (clickjacking).
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export function middleware(request: NextRequest): Promise<NextResponse> | NextResponse {
  const { pathname, search } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";

  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce, isDev);

  /**
   * Nonce komponentlarga SO'ROV SARLAVHASI orqali uzatiladi — javob
   * sarlavhasi orqali emas. Sababi: `headers()` server komponentlarida
   * kelayotgan so'rov sarlavhalarini o'qiydi.
   */
  function prepareHeaders(): Headers {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    return headers;
  }

  function withSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set("content-security-policy", csp);
    return response;
  }

  const needsAuth = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const needsAdmin = matchesPrefix(pathname, ADMIN_PREFIXES);
  const guestOnly = matchesPrefix(pathname, GUEST_ONLY_PREFIXES);

  // Hech qanday tekshiruv kerak emas — faqat sarlavhalarni qo'yamiz.
  if (!needsAuth && !needsAdmin && !guestOnly) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: prepareHeaders() } })
    );
  }

  return (async () => {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
    const claims = accessToken ? await verifyAccessToken(accessToken) : null;

    // ── Kirgan odam kirish sahifasini ko'rmasligi kerak ──────────────────
    if (guestOnly) {
      if (claims) {
        return withSecurityHeaders(
          NextResponse.redirect(new URL("/dashboard", request.url))
        );
      }
      return withSecurityHeaders(
        NextResponse.next({ request: { headers: prepareHeaders() } })
      );
    }

    // ── Token yo'q yoki muddati o'tgan ──────────────────────────────────
    if (!claims) {
      /**
       * Refresh token bor — tokenni yangilashga urinamiz.
       *
       * Yangilash MIDDLEWARE ICHIDA bajarilmaydi: u databasega yozishni
       * talab qiladi, Edge'da esa Prisma yo'q. Shuning uchun Node
       * runtime'dagi route handler'ga yuboramiz, u yangilab bo'lgach
       * `next` manziliga qaytaradi.
       *
       * Tsikl xavfi yo'q: yangilash muvaffaqiyatsiz bo'lsa o'sha handler
       * cookie'larni tozalab `/login` ga yuboradi, refresh cookie esa
       * yo'qoladi.
       */
      if (hasRefreshToken) {
        const refreshUrl = new URL("/api/auth/refresh", request.url);
        refreshUrl.searchParams.set("next", `${pathname}${search}`);
        return withSecurityHeaders(NextResponse.redirect(refreshUrl));
      }

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // ── Admin yo'llari ──────────────────────────────────────────────────
    // Bu FAQAT birinchi filtr. Haqiqiy tekshiruv `requireAdmin` da,
    // u rolni databasedan qayta o'qiydi.
    if (needsAdmin) {
      const rank = ROLE_RANK[claims.role];
      if (rank === undefined || rank < ROLE_RANK[UserRole.ADMIN]) {
        return withSecurityHeaders(
          NextResponse.redirect(new URL("/403", request.url))
        );
      }
    }

    return withSecurityHeaders(
      NextResponse.next({ request: { headers: prepareHeaders() } })
    );
  })();
}

export const config = {
  /**
   * Statik fayllar va rasm optimizatsiyasi middleware'dan o'tmasligi kerak —
   * ular uchun CSP ham, auth ham keraksiz, lekin har fayl uchun middleware
   * ishga tushishi sekinlashtiradi.
   *
   * `/api/auth/refresh` ATAYLAB ro'yxatda qoldirilgan: unga CSP kerak emas,
   * lekin uni chetlab o'tsak middleware'dan kelgan redirect ishlamas edi.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|favicon-|apple-touch-icon|web-app-manifest|site.webmanifest|robots.txt|sitemap.xml|sw.js|og-image|logo-|ozodflow-|uploads/).*)",
  ],
};
