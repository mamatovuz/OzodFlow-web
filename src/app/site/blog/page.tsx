import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Clock, X, Search, Lock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, siteOrigin, parseTags, readingTime, publicPostWhere, publishDuePosts, stripHtml } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SiteBlogList({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const [{ tag, q }, base, origin, lang, all] = await Promise.all([
    searchParams,
    siteBase(),
    siteOrigin(),
    getLang(),
    prisma.sitePost.findMany({ where: publicPostWhere(), orderBy: [{ publishDate: "desc" }] }),
  ]);

  // Telegramга yuborilishi kerak bo'lgan postlarni tekshiramiz (fon)
  publishDuePosts(origin, base);

  const tagCount = new Map<string, number>();
  for (const p of all) for (const t of parseTags(p.tags)) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const allTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);

  const query = (q || "").trim().toLowerCase();
  let posts = tag ? all.filter((p) => parseTags(p.tags).includes(tag)) : all;
  if (query) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.excerpt.toLowerCase().includes(query) ||
        stripHtml(p.contentHtml).toLowerCase().includes(query)
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <h1 className="fade-up text-3xl font-bold tracking-tight sm:text-4xl">{tr(lang, "blog")}</h1>
      <p className="fade-up mt-2 text-muted">Raqamli dunyoda raqamsiz narsalar haqida.</p>

      {/* Qidiruv */}
      <form action={`${base}/blog`} className="fade-up-1 relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q || ""}
          placeholder={tr(lang, "search")}
          className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground"
        />
      </form>

      {/* Teglar */}
      {allTags.length > 0 && (
        <div className="fade-up-2 mt-5 flex flex-wrap gap-2">
          {tag && (
            <Link href={`${base}/blog`} className="inline-flex items-center gap-1 rounded-full border border-foreground px-3 py-1 text-xs font-medium">
              <X className="h-3 w-3" /> {tag}
            </Link>
          )}
          {allTags
            .filter(([t]) => t !== tag)
            .map(([t, n]) => (
              <Link key={t} href={`${base}/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:text-foreground">
                {t} <span className="opacity-60">{n}</span>
              </Link>
            ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-muted">{query ? "Hech narsa topilmadi." : tag ? "Bu teg bo'yicha yozuv yo'q." : "Hozircha yozuv yo'q."}</p>
      ) : (
        <div className="mt-8 space-y-2">
          {posts.map((p, i) => (
            <Link
              key={p.id}
              href={`${base}/blog/${p.slug}`}
              style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
              className="fade-up group flex items-start gap-4 rounded-2xl border border-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-surface-2/40 hover:shadow-sm sm:p-4"
            >
              {p.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.coverImage} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover transition-transform group-hover:scale-105 sm:h-20 sm:w-20" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 font-semibold leading-snug group-hover:text-accent sm:text-lg">
                  {p.password && <Lock className="h-3.5 w-3.5 shrink-0 text-muted" />}
                  <span className="min-w-0">{p.title}</span>
                </h2>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                  <span>{fmt(p.publishDate)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime(p.contentHtml)} {tr(lang, "minutes")}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
