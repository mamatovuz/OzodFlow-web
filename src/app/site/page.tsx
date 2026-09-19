import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  siteBase,
  getSiteSetting,
  parseLinks,
  parseTags,
  readingTime,
  publicPostWhere,
  getActivityGrid,
} from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";
import { ActivityGrid } from "@/components/site/activity-grid";
import { NewsletterEnvelope } from "@/components/site/newsletter-envelope";
import { CoffeeCard } from "@/components/site/coffee-card";

export const dynamic = "force-dynamic";

// Bosh sahifa sarlavhasi — ota (OzodFlow) shablonisiz, faqat saytning o'zi.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSetting();
  return { title: { absolute: s.metaTitle }, description: s.metaDescription };
}

export default async function SiteHome() {
  const [base, s, posts, activity] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.sitePost.findMany({
      where: { ...publicPostWhere(), password: null },
      orderBy: [{ publishDate: "desc" }],
      take: 4,
    }),
    getActivityGrid(),
  ]);
  const links = parseLinks(s.links);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-6">
      {/* ─── Minimalist "hero" ─── */}
      <section className="pt-16 text-center sm:pt-24">
        {s.heroTagline && (
          <p className="mx-auto max-w-md text-balance text-base leading-relaxed text-muted sm:text-lg">
            {s.heroTagline}
          </p>
        )}
      </section>

      {/* ─── Faollik katakchalari (GitHub uslubi) ─── */}
      <section className="mt-10">
        <p className="mb-3 text-center text-xs font-semibold tracking-widest text-muted">{activity.year}</p>
        <ActivityGrid year={activity.year} weeks={activity.weeks} totalActive={activity.totalActive} />
      </section>

      {/* ─── So'nggi yozuvlar (ixcham) ─── */}
      {posts.length > 0 && (
        <section className="mt-14">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-tight">So'nggi yozuvlar</h2>
            <Link href={`${base}/blog`} className="text-sm text-muted transition-colors hover:text-foreground">
              Barchasi →
            </Link>
          </div>
          <div className="space-y-1.5">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`${base}/blog/${p.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-foreground/40"
              >
                {p.coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImage} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 font-medium leading-snug group-hover:text-accent">{p.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    {parseTags(p.tags)[0] && <span className="rounded-full bg-surface-2 px-2 py-0.5">{parseTags(p.tags)[0]}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime(p.contentHtml)} daq</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Ijtimoiy tarmoqlar ─── */}
      {links.length > 0 && (
        <section className="mt-14 text-center">
          <p className="mb-4 text-sm text-muted">Meni kuzatib boring</p>
          <SocialIcons links={links} />
        </section>
      )}

      {/* ─── Qo'llab-quvvatlash (kofe + Telegram) ─── */}
      {(s.coffeeUrl || s.channel) && (
        <section className="mt-16">
          <CoffeeCard coffeeUrl={s.coffeeUrl} channel={s.channel} />
        </section>
      )}

      <div className="h-20" />

      {/* Chap pastda suzuvchi obuna konverti */}
      <NewsletterEnvelope channel={s.channel} />
    </div>
  );
}
