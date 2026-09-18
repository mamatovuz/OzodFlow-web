"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

const KEY = "ozod-bookmarks";

type Item = { slug: string; title: string; savedAt: number };

function read(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function BookmarkButton({ slug, title }: { slug: string; title: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(read().some((x) => x.slug === slug));
  }, [slug]);

  function toggle() {
    const list = read();
    const exists = list.some((x) => x.slug === slug);
    const next = exists ? list.filter((x) => x.slug !== slug) : [{ slug, title, savedAt: Date.now() }, ...list];
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, 200)));
    } catch {}
    setSaved(!exists);
  }

  return (
    <button
      onClick={toggle}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
        saved ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:border-foreground hover:text-foreground"
      }`}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saqlangan" : "Saqlash"}
    </button>
  );
}
