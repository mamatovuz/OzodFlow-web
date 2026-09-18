import { prisma } from "@/lib/prisma";
import { siteCanonical, getSiteSetting, publicPostWhere } from "@/lib/site";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const [{ origin, base }, s] = await Promise.all([siteCanonical(), getSiteSetting()]);
  const posts = await prisma.sitePost.findMany({
    where: publicPostWhere(),
    orderBy: { publishDate: "desc" },
    take: 30,
  });

  const home = `${origin}${base || ""}` || origin;
  const self = `${origin}${base}/rss.xml`;
  const lastBuild = posts[0] ? new Date(posts[0].publishDate).toUTCString() : new Date().toUTCString();

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
    <title>${esc(s.siteName)}</title>
    <link>${home}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${esc(s.metaDescription)}</description>
    <language>uz</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
