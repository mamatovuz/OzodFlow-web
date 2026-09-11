import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
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
