import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Facebook, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { useSiteData } from "@/hooks/use-site-data";
import { TG_SUPPORT } from "@/lib/site-data";
import { formatDate, readingTime } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
});

function renderContent(content) {
  return String(content || "")
    .split(/\n{2,}/)
    .map((block, index) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={index} className="mt-10 font-display text-2xl font-bold">
            {trimmed.slice(3)}
          </h2>
        );
      }
      return (
        <p key={index} className="mt-5 leading-relaxed text-muted-foreground">
          {trimmed}
        </p>
      );
    });
}

function PostSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-10 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-8 aspect-video w-full animate-pulse rounded-2xl bg-muted" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </main>
  );
}

function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const btn =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-muted-foreground transition hover:border-accent hover:text-accent";

  return (
    <div className="mt-10 flex items-center gap-2 border-t pt-6">
      <span className="mr-1 text-sm font-medium text-muted-foreground">Ulashish:</span>
      <a href={tg} target="_blank" rel="noreferrer" className={btn} aria-label="Telegram">
        <Send className="h-4 w-4" />
      </a>
      <a href={fb} target="_blank" rel="noreferrer" className={btn} aria-label="Facebook">
        <Facebook className="h-4 w-4" />
      </a>
      <button type="button" onClick={copy} className={btn} aria-label="Havolani nusxalash">
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function BlogPost() {
  const { slug } = Route.useParams();
  const { data, loading } = useSiteData();
  const posts = data.posts || [];
  const post = posts.find((item) => item.slug === slug);

  useEffect(() => {
    if (post) document.title = `${post.title} - OzodFlow`;
  }, [post]);

  if (!post) {
    if (loading) return <PostSkeleton />;

    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl font-bold">Maqola topilmadi</h1>
        <p className="mt-3 text-muted-foreground">Bu maqola mavjud emas yoki o'chirilgan.</p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Blogga qaytish
        </Link>
      </main>
    );
  }

  const related = posts.filter(
    (item) =>
      item.slug !== post.slug &&
      item.published !== false &&
      (post.tags || []).some((tag) => (item.tags || []).includes(tag))
  );
  const fallback = posts.filter((item) => item.slug !== post.slug && item.published !== false);
  const relatedShown = (related.length ? related : fallback).slice(0, 2);

  const url = `https://ozodflow.uz/blog/${post.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha maqolalar
      </Link>

      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>{formatDate(post.date)}</span>
        <span className="text-muted-foreground/40">•</span>
        <span>{readingTime(post.content)}</span>
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
        {post.title}
      </h1>

      {post.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.cover && (
        <img
          src={post.cover}
          alt={post.title}
          className="mt-8 aspect-video w-full rounded-2xl border object-cover shadow-card"
        />
      )}

      <div className="mt-8 text-lg">{renderContent(post.content)}</div>

      <ShareButtons url={url} title={post.title} />

      {relatedShown.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold">O'xshash maqolalar</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {relatedShown.map((item) => (
              <Link
                key={item.id}
                to="/blog/$slug"
                params={{ slug: item.slug }}
                className="rounded-2xl border bg-card p-5 shadow-card transition hover:shadow-elevated"
              >
                <div className="text-xs font-medium text-muted-foreground">{formatDate(item.date)}</div>
                <h3 className="mt-2 font-display text-lg font-bold leading-snug">{item.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 rounded-2xl border bg-surface/60 p-6 text-center shadow-card">
        <div className="font-display text-xl font-bold">Loyihangiz bormi?</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Bepul maslahat uchun Telegram orqali yozing.
        </p>
        <a
          href={TG_SUPPORT}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-card transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Telegram'da yozish
        </a>
      </div>
    </main>
  );
}
