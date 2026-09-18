import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Clock, ArrowUpRight, Tag as TagIcon, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  siteBase,
  siteCanonical,
  absUrl,
  parseTags,
  stripHtml,
  readingTime,
  buildToc,
  bumpDailyView,
  getSiteSetting,
  isPostUnlocked,
  isSiteAdmin,
  publicPostWhere,
  relatedByContent,
  parseReactions,
  parseFaq,
  parseTranslations,
} from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";
import { LockGate } from "@/components/site/lock-gate";
import { PostReactions } from "@/components/site/post-reactions";
import { ShareButtons } from "@/components/site/share-buttons";
import { BookmarkButton } from "@/components/site/bookmark-button";
import { ReadingAids } from "@/components/site/reading-aids";
import { ArticleReader } from "@/components/site/article-reader";
import { AskArticle } from "@/components/site/ask-article";
import { HighlightShare } from "@/components/site/highlight-share";
import { FaqSection } from "@/components/site/faq-section";
import { Comments } from "@/components/site/comments";
import { BookOpen } from "lucide-react";
import { aiConfigured } from "@/lib/ai";

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
  const [post, { origin, base }] = await Promise.all([
    prisma.sitePost.findUnique({ where: { slug } }),
    siteCanonical(),
  ]);
  if (!post || post.status === "DRAFT") return { title: "Topilmadi" };
  // Rejalashtirilgan (kelajak) maqola — sarlavha/tavsif sizib chiqmasin
  if (new Date(post.publishDate).getTime() > Date.now()) return { title: "Topilmadi" };

  const title = post.metaTitle?.trim() || post.title;
  // Qulflangan maqola — tavsif/rasm sizib chiqmasin
  const description = post.password
    ? "Bu maqola qulflangan — ochish uchun parol kerak."
    : post.metaDescription?.trim() || post.excerpt || undefined;
  const custom = post.password ? undefined : absUrl(origin, post.ogImage || post.coverImage);
  const canonical = `${origin}${base}/blog/${post.slug}`;

  return {
    title,
    description,
    keywords: parseTags(post.tags),
    alternates: { canonical },
    // Yashirin post — qidiruv tizimlari indekslamasin (faqat havola bilan)
    ...(post.status === "UNLISTED" ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      url: canonical,
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
  const [base, canon, post, settings, lang] = await Promise.all([
    siteBase(),
    siteCanonical(),
    prisma.sitePost.findUnique({ where: { slug } }),
    getSiteSetting(),
    getLang(),
  ]);

  if (!post || post.status === "DRAFT") notFound();

  const isAdmin = await isSiteAdmin();

  // Rejalashtirilgan (kelajak sanali) maqola — admin bo'lmaganlarga ko'rinmaydi
  if (new Date(post.publishDate).getTime() > Date.now()) {
    if (!isAdmin) notFound();
  }

  // Qulflangan maqola — parol kiritilmagan bo'lsa qulf ekrani
  if (post.password) {
    const unlocked = await isPostUnlocked(post.id);
    if (!unlocked) {
      return (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
          <Link href={`${base}/blog`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {tr(lang, "allPosts")}
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

  const [pool, comments, seriesParts, prevPost, nextPost] = await Promise.all([
    prisma.sitePost.findMany({
      where: { ...publicPostWhere(), id: { not: post.id } },
      orderBy: [{ publishDate: "desc" }],
      take: 24,
    }),
    prisma.siteComment.findMany({
      where: { postId: post.id, approved: true },
      orderBy: { createdAt: "asc" },
      take: 100,
      // Email OMMAGA ko'rinmaydi — faqat ommaviy maydonlar
      select: { id: true, name: true, body: true, createdAt: true, parentId: true, isAuthor: true, likes: true },
    }),
    post.series
      ? prisma.sitePost.findMany({
          where: { ...publicPostWhere(), series: post.series },
          orderBy: [{ seriesOrder: "asc" }, { publishDate: "asc" }],
          select: { id: true, slug: true, title: true, seriesOrder: true },
        })
      : Promise.resolve([]),
    prisma.sitePost.findFirst({
      where: { ...publicPostWhere(), publishDate: { lt: post.publishDate }, id: { not: post.id } },
      orderBy: { publishDate: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.sitePost.findFirst({
      where: { ...publicPostWhere(), publishDate: { gt: post.publishDate }, id: { not: post.id } },
      orderBy: { publishDate: "asc" },
      select: { slug: true, title: true },
    }),
  ]);
  // O'xshash maqolalar — ma'no-yaqin (so'z-chastota) + teg bonus
  const recommended = relatedByContent(post, pool, 3);

  // AI boyitmalar
  const faq = parseFaq(post.faq);
  const translations = parseTranslations(post.translations);
  const aiOn = await aiConfigured();
  const ttsOn = true; // Edge TTS bepul, kalit shart emas

  // JSON-LD (Google boy natija) — kanonik manzil, muallif, nashriyot va nonpareil
  const canonUrl = `${canon.origin}${canon.base}/blog/${post.slug}`;
  const ogImg = absUrl(canon.origin, post.ogImage || post.coverImage);
  const wordCount = stripHtml(post.contentHtml).split(/\s+/).filter(Boolean).length;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonUrl },
    url: canonUrl,
    headline: post.title.slice(0, 110),
    datePublished: new Date(post.publishDate).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { "@type": "Person", name: settings.heroTitle || settings.siteName, url: `${canon.origin}${canon.base}/about` },
    publisher: {
      "@type": "Organization",
      name: settings.siteName,
      ...(absUrl(canon.origin, settings.ogImage) ? { logo: { "@type": "ImageObject", url: absUrl(canon.origin, settings.ogImage) } } : {}),
    },
    ...(ogImg ? { image: ogImg } : {}),
    description: post.excerpt || undefined,
    keywords: tags.join(", ") || undefined,
    wordCount,
    timeRequired: `PT${mins}M`,
    inLanguage: "uz",
  };
  // Non (breadcrumb) — qidiruv natijasida yo'l ko'rinadi
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: settings.siteName, item: `${canon.origin}${canon.base || ""}` },
      { "@type": "ListItem", position: 2, name: tr(lang, "blog"), item: `${canon.origin}${canon.base}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonUrl },
    ],
  };
  // FAQ — Google boy natija (savol-javob)
  const faqLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <ReadingAids />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <HighlightShare url={canonUrl} />

      <Link
        href={`${base}/blog`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tr(lang, "allPosts")}
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem]">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>{fmt(post.publishDate)}</span>
          {new Date(post.updatedAt).getTime() - new Date(post.publishDate).getTime() > 86400000 && (
            <span className="italic">· yangilandi {fmt(post.updatedAt)}</span>
          )}
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mins} {tr(lang, "minutes")}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t}
                href={`${base}/tag/${encodeURIComponent(t)}`}
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

      {/* AI TL;DR — o'qishdan oldin qisqacha */}
      {post.summary && !post.password && (
        <div className="mt-8 rounded-2xl border border-accent/25 bg-accent/5 p-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3.5 w-3.5" /> {tr(lang, "tldr")}
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">{post.summary}</p>
        </div>
      )}

      {/* Turkum (series) navigatsiyasi */}
      {post.series && seriesParts.length > 1 && (
        <nav className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent">
            <BookOpen className="h-4 w-4" /> {tr(lang, "series")}: {post.series}
          </p>
          <ol className="space-y-1">
            {seriesParts.map((sp, i) => (
              <li key={sp.id}>
                {sp.id === post.id ? (
                  <span className="text-sm font-medium">
                    {i + 1}-{tr(lang, "part")}. {sp.title}
                  </span>
                ) : (
                  <Link href={`${base}/blog/${sp.slug}`} className="text-sm text-muted transition-colors hover:text-accent">
                    {i + 1}-{tr(lang, "part")}. {sp.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* O'qish asboblari + mundarija (scrollspy) + matn (+ tarjima) */}
      <div className="mt-8">
        <ArticleReader
          html={html}
          toc={toc}
          translations={translations}
          slug={post.slug}
          ttsOn={ttsOn}
          labels={{
            toc: tr(lang, "toc"),
            listen: tr(lang, "listen"),
            pause: tr(lang, "pause"),
            original: tr(lang, "original"),
            translate: tr(lang, "translate"),
          }}
        />
      </div>

      {/* FAQ (boy natija) */}
      {faq.length > 0 && <FaqSection items={faq} title={tr(lang, "faqTitle")} />}

      {/* Maqoladan so'rang (AI, RAG) */}
      {aiOn && !post.password && (
        <AskArticle
          slug={post.slug}
          labels={{ title: tr(lang, "askAi"), placeholder: tr(lang, "askPlaceholder"), hint: tr(lang, "askHint") }}
        />
      )}

      {/* Ulashish + saqlash */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <ShareButtons title={post.title} />
        <BookmarkButton slug={post.slug} title={post.title} />
      </div>

      {/* Emoji reaksiyalar */}
      <div className="mt-10 border-t border-border pt-10">
        <PostReactions slug={post.slug} initialReactions={parseReactions(post.reactions)} />
      </div>

      {/* Oldingi / keyingi maqola */}
      {(prevPost || nextPost) && (
        <nav className="mt-10 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
          {prevPost ? (
            <Link href={`${base}/blog/${prevPost.slug}`} className="group rounded-xl border border-border p-4 transition-colors hover:border-foreground">
              <span className="flex items-center gap-1 text-xs text-muted"><ArrowLeft className="h-3 w-3" /> Oldingi</span>
              <p className="mt-1 line-clamp-2 font-medium group-hover:text-accent">{prevPost.title}</p>
            </Link>
          ) : (
            <span />
          )}
          {nextPost && (
            <Link href={`${base}/blog/${nextPost.slug}`} className="group rounded-xl border border-border p-4 text-right transition-colors hover:border-foreground">
              <span className="flex items-center justify-end gap-1 text-xs text-muted">Keyingi <ArrowUpRight className="h-3 w-3" /></span>
              <p className="mt-1 line-clamp-2 font-medium group-hover:text-accent">{nextPost.title}</p>
            </Link>
          )}
        </nav>
      )}

      {/* Izohlar */}
      <Comments postId={post.id} initial={JSON.parse(JSON.stringify(comments))} isAdmin={isAdmin} />

      {/* Tavsiya */}
      {recommended.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">{tr(lang, "recommend")}</h2>
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
