import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Clock, X, Search, Flame, Lock } from "lucide-react";
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
  const showExtras = !tag && !query; // ommabop bo'lim faqat filtrsiz ko'rinadi
  const popular = [...all].filter((p) => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 4);
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
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tr(lang, "blog")}</h1>
      <p className="mt-2 text-muted">Raqamli dunyoda raqamsiz narsalar haqida.</p>

      {/* Qidiruv */}
      <form action={`${base}/blog`} className="relative mt-6">
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
        <div className="mt-5 flex flex-wrap gap-2">
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

      {/* Ommabop */}
      {showExtras && popular.length >= 3 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Flame className="h-4 w-4" /> Ommabop
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {popular.map((p, i) => (
              <Link key={p.id} href={`${base}/blog/${p.slug}`} className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-foreground">
                <span className="text-lg font-bold text-muted/50">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium group-hover:text-accent">{p.title}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted"><Eye className="h-3 w-3" /> {p.views}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-muted">{query ? "Hech narsa topilmadi." : tag ? "Bu teg bo'yicha yozuv yo'q." : "Hozircha yozuv yo'q."}</p>
      ) : (
        <div className="mt-8 divide-y divide-border border-t border-border">
          {posts.map((p) => (
            <Link key={p.id} href={`${base}/blog/${p.slug}`} className="group flex items-start gap-4 py-5">
              {p.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.coverImage} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
