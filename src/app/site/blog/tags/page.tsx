import type { Metadata } from "next";
import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteBase, siteCanonical, parseTags, publicPostWhere } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { origin, base } = await siteCanonical();
  return {
    title: "Barcha teglar",
    description: "Blogdagi barcha mavzular va teglar ro'yxati.",
    alternates: { canonical: `${origin}${base}/blog/tags` },
  };
}

export default async function TagsIndex() {
  const [base, lang, posts] = await Promise.all([
    siteBase(),
    getLang(),
    prisma.sitePost.findMany({ where: publicPostWhere(), select: { tags: true } }),
  ]);

  const count = new Map<string, number>();
  for (const p of posts) for (const t of parseTags(p.tags)) count.set(t, (count.get(t) || 0) + 1);
  const tags = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = tags[0]?.[1] || 1;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
        <TagIcon className="h-7 w-7 text-accent" /> {tr(lang, "tags") || "Teglar"}
      </h1>
      <p className="mt-2 text-muted">Qiziqtirgan mavzuni tanlang — {tags.length} ta teg.</p>

      {tags.length === 0 ? (
        <p className="mt-16 text-center text-muted">Hozircha teg yo'q.</p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-2.5">
          {tags.map(([t, n]) => {
            // Ko'proq maqola — kattaroq shrift (teg buluti)
            const scale = 0.85 + (n / max) * 0.7;
            return (
              <Link
                key={t}
                href={`${base}/tag/${encodeURIComponent(t)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/50 px-3.5 py-1.5 font-medium text-muted transition-all hover:border-accent hover:text-accent"
                style={{ fontSize: `${scale}rem` }}
              >
                {t} <span className="text-xs opacity-50">{n}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
