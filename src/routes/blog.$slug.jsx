import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useEffect } from "react";

import { useSiteData } from "@/hooks/use-site-data";
import { TG_SUPPORT } from "@/lib/site-data";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPost,
});

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

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

function BlogPost() {
  const { slug } = Route.useParams();
  const { posts } = useSiteData();
  const post = (posts || []).find((item) => item.slug === slug);

  useEffect(() => {
    if (post) document.title = `${post.title} - OzodFlow`;
  }, [post]);

  if (!post) {
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha maqolalar
      </Link>

      <div className="mt-6 text-xs font-medium text-muted-foreground">{formatDate(post.date)}</div>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
        {post.title}
      </h1>

      {post.cover && (
        <img
          src={post.cover}
          alt={post.title}
          className="mt-8 aspect-video w-full rounded-2xl border object-cover shadow-card"
        />
      )}

      <div className="mt-8 text-lg">{renderContent(post.content)}</div>

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
