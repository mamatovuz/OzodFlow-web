import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Clock, Lock, Tag as TagIcon, Rss, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, siteCanonical, parseTags, readingTime, publicPostWhere } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  const { origin, base } = await siteCanonical();
  return {
    title: `#${tag}`,
    description: `"${tag}" mavzusidagi barcha maqolalar.`,
    alternates: {
      canonical: `${origin}${base}/tag/${encodeURIComponent(tag)}`,
      types: { "application/rss+xml": [{ url: `${origin}${base}/tag/${encodeURIComponent(tag)}/rss.xml`, title: `#${tag}` }] },
    },
  };
}

export default async function TagArchive({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  const [base, lang, all] = await Promise.all([
    siteBase(),
    getLang(),
    prisma.sitePost.findMany({ where: publicPostWhere(), orderBy: [{ publishDate: "desc" }] }),
  ]);

  const posts = all.filter((p) => parseTags(p.tags).includes(tag));
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <Link href={`${base}/blog/tags`} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tr(lang, "allTags")}
      </Link>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <TagIcon className="h-7 w-7 text-accent" /> {tag}
        </h1>
        <Link
          href={`${base}/tag/${encodeURIComponent(tag)}/rss.xml`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Rss className="h-3.5 w-3.5" /> RSS
        </Link>
      </div>
      <p className="mt-2 text-muted">
        {posts.length} {tr(lang, "postsInTag")}
      </p>

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
              {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>}
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                <span>{fmt(p.publishDate)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime(p.contentHtml)} {tr(lang, "minutes")}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
