import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, siteCanonical, publicPostWhere } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { origin, base } = await siteCanonical();
  return {
    title: "Arxiv",
    description: "Barcha maqolalar yil va oy bo'yicha.",
    alternates: { canonical: `${origin}${base}/blog/archive` },
  };
}

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

export default async function Archive() {
  const [base, lang, posts] = await Promise.all([
    siteBase(),
    getLang(),
    prisma.sitePost.findMany({
      where: publicPostWhere(),
      orderBy: { publishDate: "desc" },
      select: { slug: true, title: true, publishDate: true, views: true },
    }),
  ]);

  // Yil → oy → postlar
  const byYear = new Map<number, Map<number, typeof posts>>();
  for (const p of posts) {
    const d = new Date(p.publishDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!byYear.has(y)) byYear.set(y, new Map());
    const months = byYear.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <h1 className="fade-up flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
        <Calendar className="h-7 w-7 text-accent" /> {tr(lang, "archive")}
      </h1>
      <p className="mt-2 text-muted">Jami {posts.length} ta maqola.</p>

      {years.length === 0 ? (
        <p className="mt-16 text-center text-muted">Hozircha maqola yo'q.</p>
      ) : (
        <div className="fade-up-1 mt-10 space-y-10">
          {years.map((y) => {
            const months = byYear.get(y)!;
            const monthKeys = [...months.keys()].sort((a, b) => b - a);
            const yearTotal = monthKeys.reduce((s, m) => s + months.get(m)!.length, 0);
            return (
              <section key={y}>
                <div className="flex items-baseline gap-3 border-b border-border pb-2">
                  <h2 className="text-2xl font-bold text-accent">{y}</h2>
                  <span className="text-sm text-muted">{yearTotal} ta</span>
                </div>
                <div className="mt-4 space-y-6">
                  {monthKeys.map((m) => (
                    <div key={m}>
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{MONTHS[m]}</h3>
                      <ul className="space-y-1.5">
                        {months.get(m)!.map((p) => (
                          <li key={p.slug} className="flex items-center gap-3">
                            <span className="w-8 shrink-0 text-xs tabular-nums text-muted/60">
                              {String(new Date(p.publishDate).getDate()).padStart(2, "0")}
                            </span>
                            <Link href={`${base}/blog/${p.slug}`} className="min-w-0 flex-1 truncate text-sm transition-colors hover:text-accent">
                              {p.title}
                            </Link>
                            {p.views > 0 && (
                              <span className="flex shrink-0 items-center gap-1 text-xs text-muted/60">
                                <Eye className="h-3 w-3" /> {p.views}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
