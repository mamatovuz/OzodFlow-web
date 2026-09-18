import { getSiteSetting, siteBase } from "@/lib/site";

export const dynamic = "force-dynamic";

// Shaxsiy sayt PWA manifesti — "Bosh ekranga qo'shish" (o'rnatiladigan).
export async function GET() {
  const [s, base] = await Promise.all([getSiteSetting(), siteBase()]);
  const icon = s.favicon || `${base}/icon`;

  const manifest = {
    name: s.siteName,
    short_name: s.siteName.length > 12 ? s.siteName.slice(0, 12) : s.siteName,
    description: s.metaDescription,
    start_url: `${base || "/"}`,
    scope: `${base || "/"}`,
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "any", type: "image/png", purpose: "maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
