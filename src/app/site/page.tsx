import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Clock, Eye, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, getSiteSetting, parseLinks, parseTags, readingTime, publicPostWhere } from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";
import { SubscribeForm } from "@/components/site/subscribe-form";

export const dynamic = "force-dynamic";

// Bosh sahifa sarlavhasi — ota (OzodFlow) shablonisiz, faqat saytning o'zi.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSetting();
  return { title: { absolute: s.metaTitle }, description: s.metaDescription };
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SiteHome() {
  const [base, s, posts, agg] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.sitePost.findMany({
      where: publicPostWhere(),
      orderBy: [{ publishDate: "desc" }],
      take: 5,
    }),
    prisma.sitePost.aggregate({ where: publicPostWhere(), _sum: { views: true }, _count: true }),
  ]);
  const links = parseLinks(s.links);
  const [lead, ...rest] = posts;
  const totalViews = agg._sum.views || 0;
  const totalPosts = agg._count || 0;

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-6">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28">
        {/* yumshoq rang halosi */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px] dark:bg-accent/25"
        />
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.profileImage}
            alt={s.heroTitle}
            className="h-24 w-24 rounded-full object-cover ring-1 ring-border sm:h-28 sm:w-28"
          />
          <h1 className="mt-6 text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
            {s.heroTitle}
          </h1>
          {s.heroRole && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/50 px-3 py-1 text-sm text-muted">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> {s.heroRole}
            </p>
          )}
          {s.heroTagline && (
            <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-muted sm:text-lg">
              {s.heroTagline}
            </p>
          )}

          <SocialIcons className="mt-7" links={links} />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
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

          {/* Kichik ko'rsatkichlar */}
          {totalPosts > 0 && (
            <div className="mt-9 flex items-center gap-6 text-sm text-muted">
              <span><b className="font-semibold text-foreground">{totalPosts}</b> maqola</span>
              <span className="h-3 w-px bg-border" />
              <span><b className="font-semibold text-foreground">{totalViews}</b> o'qilishlar</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── So'nggi yozuvlar ─── */}
      {posts.length > 0 && (
        <section className="border-t border-border py-14">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">So'nggi yozuvlar</h2>
            <Link href={`${base}/blog`} className="text-sm text-muted transition-colors hover:text-foreground">
              Barchasi →
            </Link>
          </div>

          {/* Yetakchi maqola — katta karta */}
          {lead && (
            <Link
              href={`${base}/blog/${lead.slug}`}
              className="group block overflow-hidden rounded-3xl border border-border transition-colors hover:border-foreground/40"
            >
              {lead.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={lead.coverImage} alt="" className="aspect-[2/1] w-full object-cover" />
              )}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {parseTags(lead.tags).slice(0, 2).map((t) => (
                    <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5">{t}</span>
                  ))}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime(lead.contentHtml)} daqiqa</span>
                </div>
                <h3 className="mt-2.5 text-xl font-semibold leading-snug tracking-tight group-hover:text-accent sm:text-2xl">
                  {lead.title}
                </h3>
                {lead.excerpt && <p className="mt-2 line-clamp-2 text-muted">{lead.excerpt}</p>}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  O'qish <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          )}

          {/* Qolganlari — ro'yxat */}
          {rest.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rest.map((p) => (
                <Link
                  key={p.id}
                  href={`${base}/blog/${p.slug}`}
                  className="group flex items-start gap-3.5 rounded-2xl border border-border p-4 transition-colors hover:border-foreground/40"
                >
                  {p.coverImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.coverImage} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-accent">{p.title}</h3>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                      <span>{fmt(p.publishDate)}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Obuna ─── */}
      <section className="border-t border-border py-14">
        <SubscribeForm channel={s.channel} />
      </section>
    </div>
  );
}
