import { prisma } from "@/lib/prisma";
import { siteCanonical, absUrl, publicPostWhere } from "@/lib/site";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  image?: { loc: string; title?: string };
};

export async function GET() {
  // Kanonik domen (ozodbeck.uz) — Railway/proxy domeni orqali ochilsa ham to'g'ri.
  const { origin, base } = await siteCanonical();

  const posts = await prisma.sitePost.findMany({
    where: publicPostWhere(),
    select: { slug: true, updatedAt: true, coverImage: true, title: true },
    orderBy: { publishDate: "desc" },
  });

  const now = new Date().toISOString();
  const latest = posts[0] ? new Date(posts[0].updatedAt).toISOString() : now;
  const home = `${origin}${base || ""}` || origin;

  const urls: Entry[] = [
    { loc: home, lastmod: latest, changefreq: "daily", priority: "1.0" },
    { loc: `${origin}${base}/blog`, lastmod: latest, changefreq: "daily", priority: "0.9" },
    { loc: `${origin}${base}/projects`, changefreq: "monthly", priority: "0.6" },
    { loc: `${origin}${base}/about`, changefreq: "monthly", priority: "0.5" },
    ...posts.map((p): Entry => {
      const img = absUrl(origin, p.coverImage);
      return {
        loc: `${origin}${base}/blog/${p.slug}`,
        lastmod: new Date(p.updatedAt).toISOString(),
        changefreq: "weekly",
        priority: "0.8",
        ...(img ? { image: { loc: img, title: p.title } } : {}),
      };
    }),
  ];

  const body = urls
    .map((u) => {
      const parts = [`    <loc>${esc(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
      if (u.image) {
        parts.push(
          `    <image:image><image:loc>${esc(u.image.loc)}</image:loc>${
            u.image.title ? `<image:title>${esc(u.image.title)}</image:title>` : ""
          }</image:image>`
        );
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
