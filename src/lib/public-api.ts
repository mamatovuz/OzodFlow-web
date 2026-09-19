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
 * Sotuv reklamasi obyekti — FAQAT public API'da chiqadi. Logo yoki havola bo'lsa
 * qaytaradi, aks holda null. Logo nisbiy bo'lsa absolutga aylantiriladi.
 */
export function buildSaleAd(
  s: { saleAdLogo?: string; saleAdUrl?: string; saleAdTitle?: string; saleAdText?: string },
  origin: string
): { logo: string | null; url: string; title: string; text: string } | null {
  const logo = (s.saleAdLogo || "").trim();
  const url = (s.saleAdUrl || "").trim();
  const title = (s.saleAdTitle || "").trim();
  const text = (s.saleAdText || "").trim();
  if (!logo && !url && !title && !text) return null;
  const absLogo = logo ? (/^https?:\/\//i.test(logo) ? logo : `${origin}${logo.startsWith("/") ? "" : "/"}${logo}`) : null;
  return { logo: absLogo, url, title, text };
}
