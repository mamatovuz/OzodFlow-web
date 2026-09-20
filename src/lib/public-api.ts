// Ochiq (public) blog API — boshqa saytlar (masalan sotiladigan domen sahifasi)
// bloglarni JSON orqali olib ko'rsatishi uchun. CORS ochiq (istalgan domen).

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=120, s-maxage=300",
  };
}

// Toza JSON javob (ichki {success,data} o'ramisiz — tashqi iste'molchilar uchun qulay)
export function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

// CORS preflight (OPTIONS)
export function optionsRes(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * Kontent HTML ichidagi nisbiy havolalarni (/media/..., /blog/...) absolutga
 * aylantiradi — boshqa domenda ochilganda rasm/havolalar ishlashi uchun.
 */
export function absolutizeHtml(html: string, origin: string): string {
  if (!html) return "";
  return html.replace(/(\s(?:src|href))=(["'])\/(?!\/)/gi, `$1=$2${origin}/`);
}

/**
 * Sotuv reklamalari — FAQAT public API'da chiqadi (4 tagacha). Bo'sh reklamalar
 * tashlanadi. Logo nisbiy bo'lsa absolutga aylantiriladi.
 */
export function buildSaleAds(
  ads: { logo: string; url: string; title: string; text: string }[],
  origin: string
): { logo: string | null; url: string; title: string; text: string }[] {
  return ads
    .filter((a) => a.logo || a.url || a.title || a.text)
    .slice(0, 4)
    .map((a) => ({
      logo: a.logo ? (/^https?:\/\//i.test(a.logo) ? a.logo : `${origin}${a.logo.startsWith("/") ? "" : "/"}${a.logo}`) : null,
      url: a.url,
      title: a.title,
      text: a.text,
    }));
}
