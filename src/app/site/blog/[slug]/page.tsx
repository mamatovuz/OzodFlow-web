import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Clock, ArrowUpRight, Tag as TagIcon, List } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  siteBase,
  siteOrigin,
  absUrl,
  parseTags,
  readingTime,
  buildToc,
  bumpDailyView,
  getSiteSetting,
  isPostUnlocked,
} from "@/lib/site";
import { LockGate } from "@/components/site/lock-gate";
import { PostContent } from "@/components/site/post-content";
import { PostReactions } from "@/components/site/post-reactions";
import { ShareButtons } from "@/components/site/share-buttons";
import { ReadingAids } from "@/components/site/reading-aids";
import { Comments } from "@/components/site/comments";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, origin] = await Promise.all([
    prisma.sitePost.findUnique({ where: { slug } }),
    siteOrigin(),
  ]);
  if (!post || post.status === "DRAFT") return { title: "Topilmadi" };

  const title = post.metaTitle?.trim() || post.title;
  // Qulflangan maqola — tavsif/rasm sizib chiqmasin
  const description = post.password
    ? "Bu maqola qulflangan — ochish uchun parol kerak."
    : post.metaDescription?.trim() || post.excerpt || undefined;
  const custom = post.password ? undefined : absUrl(origin, post.ogImage || post.coverImage);

  return {
    title,
    description,
    keywords: parseTags(post.tags),
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: new Date(post.publishDate).toISOString(),
      tags: parseTags(post.tags),
      ...(custom ? { images: [{ url: custom }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(custom ? { images: [custom] } : {}),
    },
  };
}

export default async function SiteBlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [base, origin, post, settings] = await Promise.all([
    siteBase(),
    siteOrigin(),
    prisma.sitePost.findUnique({ where: { slug } }),
    getSiteSetting(),
  ]);

  if (!post || post.status === "DRAFT") notFound();

  // Qulflangan maqola — parol kiritilmagan bo'lsa qulf ekrani
  if (post.password) {
    const unlocked = await isPostUnlocked(post.id);
    if (!unlocked) {
      return (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
          <Link href={`${base}/blog`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Barcha yozuvlar
          </Link>
          <LockGate slug={post.slug} title={post.title} />
        </div>
      );
    }
  }

  // Ko'rishlar (fon rejimida) + kunlik stat
  prisma.sitePost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});
  bumpDailyView();

  const tags = parseTags(post.tags);
  const mins = readingTime(post.contentHtml);
  const { html, toc } = buildToc(post.contentHtml);

  const [recommended, comments] = await Promise.all([
    prisma.sitePost.findMany({
      where: { status: { in: ["PUBLIC", "SITE"] }, id: { not: post.id } },
      orderBy: [{ publishDate: "desc" }],
      take: 3,
    }),
    prisma.siteComment.findMany({
      where: { postId: post.id, approved: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  // JSON-LD (Google boy natija)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: new Date(post.publishDate).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { "@type": "Person", name: settings.siteName },
    image: absUrl(origin, post.ogImage || post.coverImage) || undefined,
    description: post.excerpt || undefined,
    keywords: tags.join(", ") || undefined,
  };

  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <ReadingAids />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link
        href={`${base}/blog`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha yozuvlar
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem]">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>{fmt(post.publishDate)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mins} daqiqa</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t}
                href={`${base}/blog?tag=${encodeURIComponent(t)}`}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
              >
                <TagIcon className="h-3 w-3" /> {t}
              </Link>
            ))}
          </div>
        )}
      </header>

      {post.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.coverImage} alt={post.title} className="mt-8 w-full rounded-2xl object-cover" />
      )}

      {/* Mundarija */}
      {toc.length >= 3 && (
        <nav className="mt-8 rounded-xl border border-border bg-surface-2/40 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
            <List className="h-4 w-4" /> Mundarija
          </p>
          <ul className="space-y-1">
            {toc.map((t) => (
              <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                <a href={`#${t.id}`} className="text-sm text-muted transition-colors hover:text-accent">
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8">
        <PostContent html={html} />
      </div>

      {/* Ulashish */}
      <div className="mt-10 border-t border-border pt-6">
        <ShareButtons title={post.title} />
      </div>

      {/* Yoqdi / Yoqmadi */}
      <div className="mt-10 border-t border-border pt-10">
        <PostReactions slug={post.slug} initialLikes={post.likes} initialDislikes={post.dislikes} />
      </div>

      {/* Izohlar */}
      <Comments postId={post.id} initial={JSON.parse(JSON.stringify(comments))} />

      {/* Tavsiya */}
      {recommended.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">Tavsiya etamiz</h2>
          <div className="space-y-2">
            {recommended.map((r) => (
              <Link
                key={r.id}
                href={`${base}/blog/${r.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-foreground"
              >
                {r.coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={r.coverImage} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium group-hover:text-accent">{r.title}</h3>
                  <p className="truncate text-sm text-muted">{r.excerpt || fmt(r.publishDate)}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
