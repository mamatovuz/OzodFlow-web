"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Trash2, ArrowUpRight } from "lucide-react";

type Item = { slug: string; title: string; savedAt: number };

export default function SavedPage() {
  const pathname = usePathname();
  const base = pathname.replace(/\/saved\/?$/, "");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("ozod-bookmarks") || "[]"));
    } catch {}
  }, []);

  function remove(slug: string) {
    const next = items.filter((x) => x.slug !== slug);
    setItems(next);
    try {
      localStorage.setItem("ozod-bookmarks", JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
      <h1 className="fade-up flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
        <Bookmark className="h-7 w-7" /> Saqlangan
      </h1>
      <p className="mt-2 text-muted">Siz belgilab qo'ygan maqolalar (shu qurilmada saqlanadi).</p>

      {items.length === 0 ? (
        <p className="mt-16 text-center text-muted">Hali saqlangan maqola yo'q.</p>
      ) : (
        <div className="mt-8 space-y-2">
          {items.map((it) => (
            <div key={it.slug} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-sm">
              <Link href={`${base}/blog/${it.slug}`} className="group flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-medium group-hover:text-accent">{it.title}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
              <button onClick={() => remove(it.slug)} className="rounded-lg p-2 text-muted hover:text-red-500" title="O'chirish">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
