import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useSiteData } from "@/hooks/use-site-data";
import { formatDate, readingTime } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog - OzodFlow" },
      { name: "description", content: "Sayt, Telegram bot va CRM haqida foydali maqolalar." },
    ],
  }),
  component: BlogIndex,
});

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function BlogIndex() {
  const { data, loading } = useSiteData();
  const published = useMemo(
    () => (data.posts || []).filter((post) => post.published !== false),
    [data.posts]
  );

  const tags = useMemo(() => {
    const set = new Set();
    published.forEach((post) => (post.tags || []).forEach((tag) => set.add(tag)));
    return [...set];
  }, [published]);

  const [activeTag, setActiveTag] = useState(null);
  const visible = activeTag
    ? published.filter((post) => (post.tags || []).includes(activeTag))
    : published;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <div className="max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">Blog</div>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Foydali maqolalar
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sayt, bot va CRM haqida tushunarli tilda yozilgan maqolalar.
        </p>
      </div>

      {tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeTag === null ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-accent"
            }`}
          >
            Barchasi
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                activeTag === tag ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-accent"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading && published.length === 0 ? (
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-14 text-muted-foreground">Hozircha maqolalar yo'q.</p>
      ) : (
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {visible.map((post) => (
            <article
              key={post.id}
              className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition hover:shadow-elevated"
            >
              <Link to="/blog/$slug" params={{ slug: post.slug }} className="block aspect-video overflow-hidden bg-surface">
                {post.cover ? (
                  <img src={post.cover} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-sky/10">
                    <span className="px-6 text-center font-display text-xl font-bold text-muted-foreground/40">
                      {post.title}
                    </span>
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>{formatDate(post.date)}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{readingTime(post.content)}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold leading-snug">{post.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                {post.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Batafsil <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
