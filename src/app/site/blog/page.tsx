import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteBase } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long" });
}

export default async function SiteBlogList() {
  const [base, posts] = await Promise.all([
    siteBase(),
    prisma.sitePost.findMany({
      where: { status: { in: ["PUBLIC", "SITE"] } },
      orderBy: [{ publishDate: "desc" }],
    }),
  ]);

  // Yil bo'yicha guruhlash
  const byYear = new Map<number, typeof posts>();
  for (const p of posts) {
    const y = new Date(p.publishDate).getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
      <p className="mt-2 text-muted">Raqamli dunyoda raqamsiz narsalar haqida.</p>

      {posts.length === 0 ? (
        <p className="mt-16 text-center text-muted">Hozircha yozuv yo'q.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...byYear.entries()].map(([year, yearPosts]) => (
            <section key={year}>
              <div className="mb-3 text-sm font-semibold text-muted">{year}</div>
              <ul className="divide-y divide-border border-t border-border">
                {yearPosts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${base}/blog/${p.slug}`}
                      className="group flex items-baseline gap-4 py-3.5 transition-colors"
                    >
                      <span className="w-24 shrink-0 text-sm text-muted">{fmt(p.publishDate)}</span>
                      <span className="font-medium group-hover:text-accent">{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
