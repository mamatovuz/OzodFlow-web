import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Clock, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, parseTags, readingTime } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SiteBlogList({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const [{ tag }, base, all] = await Promise.all([
    searchParams,
    siteBase(),
    prisma.sitePost.findMany({
      where: { status: { in: ["PUBLIC", "SITE"] } },
      orderBy: [{ publishDate: "desc" }],
    }),
  ]);

  // Barcha teglar (bulut)
  const tagCount = new Map<string, number>();
  for (const p of all) for (const t of parseTags(p.tags)) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const allTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);

  const posts = tag ? all.filter((p) => parseTags(p.tags).includes(tag)) : all;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
      <p className="mt-2 text-muted">Raqamli dunyoda raqamsiz narsalar haqida.</p>

      {/* Teglar bulutchasi */}
      {allTags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tag && (
            <Link
              href={`${base}/blog`}
              className="inline-flex items-center gap-1 rounded-full border border-foreground px-3 py-1 text-xs font-medium"
            >
              <X className="h-3 w-3" /> {tag}
            </Link>
          )}
          {allTags
            .filter(([t]) => t !== tag)
            .map(([t, n]) => (
              <Link
                key={t}
                href={`${base}/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
              >
                {t} <span className="opacity-60">{n}</span>
              </Link>
            ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-muted">{tag ? "Bu teg bo'yicha yozuv yo'q." : "Hozircha yozuv yo'q."}</p>
      ) : (
        <div className="mt-10 divide-y divide-border border-t border-border">
          {posts.map((p) => (
            <Link key={p.id} href={`${base}/blog/${p.slug}`} className="group flex items-start gap-4 py-5">
              {p.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.coverImage} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold leading-snug group-hover:text-accent sm:text-lg">{p.title}</h2>
                {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>}
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                  <span>{fmt(p.publishDate)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime(p.contentHtml)} daq</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
