import { siteCanonical } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  // Kanonik domen (ozodbeck.uz) — sitemap havolasi doim haqiqiy domenni ko'rsatadi.
  const { origin } = await siteCanonical();
  const body = `# ${origin}
User-agent: *
Allow: /
Disallow: /panel
Disallow: /saved
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
