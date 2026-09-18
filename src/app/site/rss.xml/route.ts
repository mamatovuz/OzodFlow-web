import { prisma } from "@/lib/prisma";
import { siteOrigin, siteBase, getSiteSetting } from "@/lib/site";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const [origin, base, s] = await Promise.all([siteOrigin(), siteBase(), getSiteSetting()]);
  const posts = await prisma.sitePost.findMany({
    where: { status: { in: ["PUBLIC", "SITE"] } },
    orderBy: { publishDate: "desc" },
    take: 30,
  });

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${origin}${base}/blog/${p.slug}</link>
      <guid>${origin}${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishDate).toUTCString()}</pubDate>
      <description>${esc(p.excerpt || "")}</description>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(s.siteName)}</title>
    <link>${origin}${base || ""}</link>
    <description>${esc(s.metaDescription)}</description>
    <language>uz</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml" } });
}
