import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = await siteOrigin();
  const body = `User-agent: *
Allow: /
Disallow: /panel

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
