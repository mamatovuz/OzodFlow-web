import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Eye, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SiteNav } from "@/components/landing/site-nav";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — OzodFlow",
  description: "OzodFlow yangiliklari, yangilanishlar va restoran biznesi uchun maslahatlar",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogListPage() {
  const [user, posts] = await Promise.all([
    getSessionUser(),
    prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav loggedIn={!!user} />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Bosh sahifa
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Blog</h1>
          <p className="mt-2 text-muted">
            Yangiliklar, yangilanishlar va restoran biznesi uchun foydali maslahatlar
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-border py-20 text-center">
            <Newspaper className="h-10 w-10 text-muted/40" />
            <p className="mt-3 font-medium text-foreground">Hozircha maqola yo'q</p>
            <p className="mt-1 text-sm text-muted">Tez orada yangi maqolalar chiqadi</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
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
                  <h2 className="font-semibold text-foreground group-hover:text-accent">
                    {p.title}
                  </h2>
                  <p className="mt-1 line-clamp-3 text-sm text-muted">{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-10">
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
