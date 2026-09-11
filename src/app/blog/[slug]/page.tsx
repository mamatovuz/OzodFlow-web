import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Calendar, Newspaper, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SiteNav } from "@/components/landing/site-nav";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/logo";
import { BlogGallery } from "@/components/blog/blog-gallery";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.isPublished) return { title: "Maqola topilmadi" };
  return {
    title: `${post.title} — OzodFlow Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [user, post] = await Promise.all([
    getSessionUser(),
    prisma.blogPost.findUnique({ where: { slug } }),
  ]);

  if (!post || !post.isPublished) notFound();

  // Ko'rishlar sonini oshiramiz (admin ko'rishi statistikaga ta'sir qilmasligi uchun
  // faqat oddiy mehmonlarda)
  if (!user) {
    await prisma.blogPost
      .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      .catch(() => {});
  }

  let images: string[] = [];
  try {
    images = JSON.parse(post.images || "[]");
  } catch {
    images = [];
  }
  // Barcha rasmlar: muqova birinchi, keyin qo'shimchalar (takrorsiz).
  // Preview slayder va lightbox shu ro'yxatdan foydalanadi.
  const allImages = [post.coverImage, ...images].filter(
    (img, i, arr): img is string => !!img && arr.indexOf(img) === i
  );

  // Tavsiya etiladigan 3 ta boshqa maqola (yulduzchali → ko'p ko'rilgan → yangi)
  const related = await prisma.blogPost.findMany({
    where: { isPublished: true, id: { not: post.id } },
    orderBy: [{ isFeatured: "desc" }, { views: "desc" }, { publishDate: "desc" }],
    take: 3,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav loggedIn={!!user} />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Barcha maqolalar
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> {fmtDate(post.publishDate)}
          </span>
          {post.version && <Badge variant="accent">{post.version}</Badge>}
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" /> {post.views + (user ? 0 : 1)}
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted">{post.description}</p>

        {/* Preview slayder (avtomatik almashadi) + bosilsa lightbox */}
        <BlogGallery images={allImages} title={post.title} />

        {post.body && (
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-foreground">
            {post.body}
          </div>
        )}
      </article>

      {/* ─── Tavsiya etamiz — boshqa maqolalar ─── */}
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <div className="border-t border-border pt-10">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Sparkles className="h-5 w-5 text-accent" /> Tavsiya etamiz
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-surface-2">
                    {p.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted/40">
                        <Newspaper className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{fmtDate(p.publishDate)}</span>
                      {p.version && <Badge variant="accent">{p.version}</Badge>}
                      <span className="ml-auto flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {p.views}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-accent">
                      {p.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="mt-8 border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} OzodFlow. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
