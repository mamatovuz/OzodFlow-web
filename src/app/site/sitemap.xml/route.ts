import { prisma } from "@/lib/prisma";
import { siteOrigin, siteBase, publicPostWhere } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const [origin, base] = await Promise.all([siteOrigin(), siteBase()]);
  const posts = await prisma.sitePost.findMany({
    where: publicPostWhere(),
    select: { slug: true, updatedAt: true },
    orderBy: { publishDate: "desc" },
  });

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${origin}${base || ""}` || origin },
    { loc: `${origin}${base}/blog` },
    { loc: `${origin}${base}/about` },
    { loc: `${origin}${base}/projects` },
    ...posts.map((p) => ({ loc: `${origin}${base}/blog/${p.slug}`, lastmod: new Date(p.updatedAt).toISOString() })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
