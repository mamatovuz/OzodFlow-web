import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteCanonical, getSiteSetting, absUrl, parseTags, readingTime } from "@/lib/site";
import { jsonRes, optionsRes, absolutizeHtml } from "@/lib/public-api";

export const dynamic = "force-dynamic";

// GET /api/public/posts/<slug> — bitta blogning to'liq mazmuni (JSON, CORS ochiq).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ origin, base }, s, post] = await Promise.all([
    siteCanonical(),
    getSiteSetting(),
    prisma.sitePost.findUnique({ where: { slug } }),
  ]);

  // Faqat e'lon qilingan, sanasi kelgan, qulflanmagan postlar
  if (
    !post ||
    !(post.status === "PUBLIC" || post.status === "SITE") ||
    post.password ||
    new Date(post.publishDate).getTime() > Date.now()
  ) {
    return jsonRes({ error: "Topilmadi" }, 404);
  }

  return jsonRes({
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || "",
      coverImage: absUrl(origin, post.coverImage) || null,
      contentHtml: absolutizeHtml(post.contentHtml, origin),
      tags: parseTags(post.tags),
      readingTime: readingTime(post.contentHtml),
      views: post.views,
      publishDate: new Date(post.publishDate).toISOString(),
      updatedAt: new Date(post.updatedAt).toISOString(),
      url: `${origin}${base}/blog/${post.slug}`,
    },
    site: { name: s.siteName, url: `${origin}${base || ""}` },
  });
}

export function OPTIONS() {
  return optionsRes();
}
