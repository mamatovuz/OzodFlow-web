import { prisma } from "@/lib/prisma";
import { siteCanonical, getSiteSetting, parseTags, publicPostWhere } from "@/lib/site";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: Request, ctx: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await ctx.params;
  const tag = decodeURIComponent(raw);
  const [{ origin, base }, s] = await Promise.all([siteCanonical(), getSiteSetting()]);

  const all = await prisma.sitePost.findMany({ where: publicPostWhere(), orderBy: { publishDate: "desc" }, take: 100 });
  const posts = all.filter((p) => parseTags(p.tags).includes(tag)).slice(0, 30);

  const self = `${origin}${base}/tag/${encodeURIComponent(tag)}/rss.xml`;
  const items = posts
    .map((p) => {
      const link = `${origin}${base}/blog/${p.slug}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.publishDate).toUTCString()}</pubDate>
      <description>${esc(p.excerpt || "")}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(s.siteName)} — #${esc(tag)}</title>
    <link>${origin}${base}/tag/${encodeURIComponent(tag)}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${esc(tag)} mavzusidagi maqolalar</description>
    <language>uz</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
