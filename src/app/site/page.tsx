import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, getSiteSetting, parseLinks } from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SiteHome() {
  const [base, s, featured] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.sitePost.findMany({
      where: { status: "SITE" },
      orderBy: [{ publishDate: "desc" }],
      take: 4,
    }),
  ]);
  const links = parseLinks(s.links);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-6">
      {/* Hero — sokin, minimalist */}
      <section className="flex flex-col items-center pt-20 pb-14 text-center sm:pt-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.profileImage}
          alt={s.heroTitle}
          className="h-28 w-28 rounded-full object-cover ring-1 ring-border sm:h-32 sm:w-32"
        />
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-[2.6rem]">{s.heroTitle}</h1>
        {s.heroRole && <p className="mt-1.5 text-muted">{s.heroRole}</p>}
        {s.heroTagline && (
          <p className="mt-6 max-w-md text-balance leading-relaxed text-muted">{s.heroTagline}</p>
        )}

        <SocialIcons className="mt-7" links={links} />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href={`${base}/blog`}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Blogni o'qish
          </Link>
          <Link
            href={`${base}/about`}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            Men haqimda
          </Link>
        </div>
      </section>

      {/* Tanlangan yozuvlar */}
      {featured.length > 0 && (
        <section className="border-t border-border py-12">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Yozuvlar</h2>
            <Link href={`${base}/blog`} className="text-sm text-muted hover:text-foreground">
              Barchasi →
            </Link>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`${base}/blog/${p.slug}`}
                className="group flex items-center gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium group-hover:text-accent">{p.title}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted">{p.excerpt || fmt(p.publishDate)}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
