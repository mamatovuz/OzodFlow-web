import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, getSiteSetting } from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export default async function SiteHome() {
  const [base, s, featured] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.sitePost.findMany({
      where: { status: "SITE" },
      orderBy: [{ publishDate: "desc" }],
      take: 3,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      {/* Hero */}
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.profileImage}
          alt={s.heroTitle}
          className="h-32 w-32 rounded-full object-cover ring-1 ring-border sm:h-36 sm:w-36"
        />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{s.heroTitle}</h1>
        <p className="mt-2 text-lg text-muted">{s.heroRole}</p>

        <SocialIcons
          className="mt-6"
          youtube={s.youtube}
          github={s.github}
          linkedin={s.linkedin}
          telegram={s.telegram}
        />

        <p className="mt-8 max-w-xl text-balance text-base text-muted sm:text-lg">{s.heroTagline}</p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`${base}/blog`}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Blogni o'qish <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`${base}/about`}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            Men haqimda
          </Link>
        </div>
      </section>

      {/* Saytda ko'rsatiladigan tanlangan bloglar */}
      {featured.length > 0 && (
        <section className="border-t border-border py-12">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted">Tanlangan yozuvlar</h2>
          <div className="space-y-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`${base}/blog/${p.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-foreground"
              >
                {p.coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImage} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-semibold group-hover:text-accent">{p.title}</h3>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.excerpt || fmt(p.publishDate)}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
