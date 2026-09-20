import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseTags } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loyihalar" };

export default async function SiteProjects() {
  const projects = await prisma.siteProject.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
      <h1 className="fade-up text-3xl font-bold tracking-tight sm:text-4xl">Loyihalar</h1>
      <p className="mt-2 text-muted">Men ishlagan va yaratgan ishlar.</p>

      {projects.length === 0 ? (
        <p className="mt-16 text-center text-muted">Hozircha loyiha yo'q.</p>
      ) : (
        <div className="fade-up-1 mt-10 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const tags = parseTags(p.tags);
            const Card = (
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground">
                {p.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.image} alt={p.title} className="aspect-[16/10] w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="flex items-center gap-1.5 font-semibold group-hover:text-accent">
                    {p.title}
                    {p.url && <ExternalLink className="h-3.5 w-3.5 text-muted" />}
                  </h2>
                  {p.description && <p className="mt-1.5 flex-1 text-sm text-muted">{p.description}</p>}
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
            return p.url ? (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                {Card}
              </a>
            ) : (
              <div key={p.id}>{Card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
