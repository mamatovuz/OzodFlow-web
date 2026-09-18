import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────
// Shaxsiy sayt (Ozodbek's Blog) uchun domen-yo'naltirish.
// Bitta serverda, bitta papkada, lekin alohida domen.
//
// PERSONAL_SITE_HOST env'iga domen(lar)ni yozing (vergul bilan), masalan:
//   PERSONAL_SITE_HOST="ozodbek.uz,www.ozodbek.uz"
// O'sha domendan kelgan so'rov ichki `/site/...` yo'liga o'giriladi.
// OzodFlow asosiy domeni o'zgarishsiz ishlayveradi.
// ─────────────────────────────────────────────

const SITE_HOSTS = (process.env.PERSONAL_SITE_HOST || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  // Faqat shaxsiy sayt domeni bo'lsa yo'naltiramiz
  if (SITE_HOSTS.length === 0 || !SITE_HOSTS.includes(host)) {
    return NextResponse.next();
  }

  // SEO fayllari — /site ichidagi generatorlarga yo'naltiramiz
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt" || pathname === "/rss.xml") {
    const seo = req.nextUrl.clone();
    seo.pathname = `/site${pathname}`;
    return NextResponse.rewrite(seo);
  }

  // Ichki texnik yo'llar — tegmaymiz
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/site") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // fayl kengaytmasi bor (rasm, css, ...)
  ) {
    return NextResponse.next();
  }

  // /  →  /site,  /blog  →  /site/blog,  /panel → /site/panel ...
  const url = req.nextUrl.clone();
  url.pathname = `/site${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
