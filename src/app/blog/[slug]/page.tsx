import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SiteNav } from "@/components/landing/site-nav";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/logo";

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
  // muqovadan boshqa qo'shimcha rasmlar
  const gallery = images.filter((img) => img && img !== post.coverImage);

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

        {post.coverImage && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImage} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {post.body && (
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-foreground">
            {post.body}
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {gallery.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`${post.title} — ${i + 1}`} className="w-full object-cover" />
              </div>
            ))}
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
