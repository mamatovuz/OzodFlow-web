import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, siteOrigin, absUrl } from "@/lib/site";
import { PostReactions } from "@/components/site/post-reactions";

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
  const description = post.metaDescription?.trim() || post.excerpt || undefined;
  // Admin bergan rasm bo'lsa — o'shani ishlatamiz; bo'lmasa avto-OG (opengraph-image.tsx) ishlaydi.
  const custom = absUrl(origin, post.ogImage || post.coverImage);

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: new Date(post.publishDate).toISOString(),
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
  const [base, post] = await Promise.all([
    siteBase(),
    prisma.sitePost.findUnique({ where: { slug } }),
  ]);

  if (!post || post.status === "DRAFT") notFound();

  // Ko'rishlar (fon rejimida)
  prisma.sitePost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});

  // Tavsiya — boshqa maqolalar
  const recommended = await prisma.sitePost.findMany({
    where: { status: { in: ["PUBLIC", "SITE"] }, id: { not: post.id } },
    orderBy: [{ publishDate: "desc" }],
    take: 3,
  });

  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <Link
        href={`${base}/blog`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha yozuvlar
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem]">{post.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted">
          <span>{fmt(post.publishDate)}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {post.views}
          </span>
        </div>
      </header>

      {post.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.coverImage} alt={post.title} className="mt-8 w-full rounded-2xl object-cover" />
      )}

      <div className="site-content mt-8" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

      {/* Yoqdi / Yoqmadi */}
      <div className="mt-12 border-t border-border pt-10">
        <PostReactions slug={post.slug} initialLikes={post.likes} initialDislikes={post.dislikes} />
      </div>

      {/* Tavsiya etilgan maqolalar */}
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
