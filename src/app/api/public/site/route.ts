import { siteCanonical, getSiteSetting, absUrl, parseLinks } from "@/lib/site";
import { jsonRes, optionsRes, buildSaleAd } from "@/lib/public-api";

export const dynamic = "force-dynamic";

// GET /api/public/site — sayt meta + sotuv reklamasi (logo, havola) + ijtimoiy.
// Sotiladigan domen sahifasi shu API'dan reklamani oladi. Blog saytda ko'rinmaydi.
export async function GET() {
  const [{ origin, base }, s] = await Promise.all([siteCanonical(), getSiteSetting()]);
  return jsonRes({
    site: {
      name: s.siteName,
      url: `${origin}${base || ""}`,
      description: s.metaDescription,
      logo: absUrl(origin, s.ogImage || s.profileImage) || null,
    },
    ad: buildSaleAd(s, origin), // faqat API'da chiqadigan reklama
    social: parseLinks(s.links).map((l) => ({ icon: l.icon, url: l.url, label: l.label || l.icon })),
  });
}

export function OPTIONS() {
  return optionsRes();
}
