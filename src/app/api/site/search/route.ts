import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { parseTags, publicPostWhere, stripHtml } from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Ommaviy tez qidiruv (Cmd+K) — sarlavha/qisqacha/matn/teg bo'yicha.
export async function GET(req: NextRequest) {
  const limited = limitOrReject(req, "site-search", { limit: 60, windowMs: WINDOW.minute });
  if (limited) return limited;

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return ok({ items: [] });

  const all = await prisma.sitePost.findMany({
    where: publicPostWhere(),
    orderBy: { publishDate: "desc" },
    select: { slug: true, title: true, excerpt: true, contentHtml: true, tags: true, coverImage: true, password: true },
    take: 300,
  });

  const scored = all
    .map((p) => {
      const title = p.title.toLowerCase();
      const excerpt = (p.excerpt || "").toLowerCase();
      const tags = parseTags(p.tags).join(" ").toLowerCase();
      const inBody = stripHtml(p.contentHtml).toLowerCase().includes(q);
      let score = 0;
      if (title.includes(q)) score += 10;
      if (title.startsWith(q)) score += 5;
      if (tags.includes(q)) score += 4;
      if (excerpt.includes(q)) score += 3;
      if (inBody) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return ok({
    items: scored.map(({ p }) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      coverImage: p.coverImage,
      locked: !!p.password,
      tags: parseTags(p.tags).slice(0, 3),
    })),
  });
}
