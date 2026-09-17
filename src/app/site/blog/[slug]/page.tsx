import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase } from "@/lib/site";

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
  const post = await prisma.sitePost.findUnique({ where: { slug } });
  if (!post) return { title: "Topilmadi" };
  return { title: post.title, description: post.excerpt };
}

export default async function SiteBlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [base, post] = await Promise.all([
    siteBase(),
    prisma.sitePost.findUnique({ where: { slug } }),
  ]);

  // DRAFT — ommaga ko'rinmaydi
  if (!post || post.status === "DRAFT") notFound();

  // Ko'rishlar (fon rejimida, xatosini yutamiz)
  prisma.sitePost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <Link
        href={`${base}/blog`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha yozuvlar
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted">{fmt(post.publishDate)}</p>
      </header>

      {post.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.coverImage}
          alt={post.title}
          className="mt-8 w-full rounded-2xl object-cover"
        />
      )}

      <div
        className="site-content mt-8"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
