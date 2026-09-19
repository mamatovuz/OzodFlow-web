import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteCanonical, getSiteSetting, absUrl, parseTags, readingTime, publicPostWhere } from "@/lib/site";
import { jsonRes, optionsRes, buildSaleAd } from "@/lib/public-api";

export const dynamic = "force-dynamic";

// GET /api/public/posts?limit=20&tag=react&offset=0
// Ommaviy blog ro'yxati (JSON). CORS ochiq — istalgan sayt chaqira oladi.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const tag = (sp.get("tag") || "").trim();

  const [{ origin, base }, s] = await Promise.all([siteCanonical(), getSiteSetting()]);

  // Qulflangan (parolli) postlar public API'da chiqmaydi (kontent sizib chiqmasin)
  const where = { ...publicPostWhere(), password: null };
  const [total, posts] = await Promise.all([
    prisma.sitePost.count({ where }),
    prisma.sitePost.findMany({
      where,
      orderBy: [{ publishDate: "desc" }],
      skip: offset,
      take: limit,
      select: {
        slug: true, title: true, excerpt: true, coverImage: true, tags: true,
        contentHtml: true, publishDate: true, views: true,
      },
    }),
  ]);

  const items = posts
    .filter((p) => (tag ? parseTags(p.tags).includes(tag) : true))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      coverImage: absUrl(origin, p.coverImage) || null,
      tags: parseTags(p.tags),
      readingTime: readingTime(p.contentHtml),
      views: p.views,
      publishDate: new Date(p.publishDate).toISOString(),
      url: `${origin}${base}/blog/${p.slug}`,
    }));

  return jsonRes({
    site: { name: s.siteName, url: `${origin}${base || ""}`, description: s.metaDescription },
    ad: buildSaleAd(s, origin), // sotuv reklamasi (faqat API'da) — yo'q bo'lsa null
    total,
    count: items.length,
    posts: items,
  });
}

export function OPTIONS() {
  return optionsRes();
}
