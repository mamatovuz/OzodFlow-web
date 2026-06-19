import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useSiteData } from "@/hooks/use-site-data";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog - OzodFlow" },
      { name: "description", content: "Sayt, Telegram bot va CRM haqida foydali maqolalar." },
    ],
  }),
  component: BlogIndex,
});

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

function BlogIndex() {
  const { posts } = useSiteData();
  const published = (posts || []).filter((post) => post.published !== false);

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

      {published.length === 0 ? (
        <p className="mt-14 text-muted-foreground">Hozircha maqolalar yo'q.</p>
      ) : (
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {published.map((post) => (
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
                <div className="text-xs font-medium text-muted-foreground">{formatDate(post.date)}</div>
                <h2 className="mt-2 font-display text-2xl font-bold leading-snug">{post.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
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
