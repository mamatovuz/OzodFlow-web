"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type Vote = "like" | "dislike" | null;

export function PostReactions({
  slug,
  initialLikes,
  initialDislikes,
}: {
  slug: string;
  initialLikes: number;
  initialDislikes: number;
}) {
  const key = `ozod-react-${slug}`;
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [vote, setVote] = useState<Vote>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === "like" || v === "dislike") setVote(v);
    } catch {}
  }, [key]);

  async function react(type: "like" | "dislike") {
    if (busy) return;
    setBusy(true);
    const prev = vote;
    try {
      const res = await fetch("/api/site/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, type, prev }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setLikes(json.data.likes);
        setDislikes(json.data.dislikes);
        setVote(json.data.vote);
        try {
          if (json.data.vote) localStorage.setItem(key, json.data.vote);
          else localStorage.removeItem(key);
        } catch {}
      }
    } catch {}
    setBusy(false);
  }

  const total = likes + dislikes;
  const pct = total ? Math.round((likes / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted">Maqola yoqdimi?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => react("like")}
          disabled={busy}
          aria-pressed={vote === "like"}
          className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            vote === "like"
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border text-muted hover:border-foreground hover:text-foreground"
          }`}
        >
          <ThumbsUp className="h-4 w-4" /> {likes}
        </button>
        <button
          onClick={() => react("dislike")}
          disabled={busy}
          aria-pressed={vote === "dislike"}
          className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            vote === "dislike"
              ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
              : "border-border text-muted hover:border-foreground hover:text-foreground"
          }`}
        >
          <ThumbsDown className="h-4 w-4" /> {dislikes}
        </button>
      </div>
      {total > 0 && (
        <p className="text-xs text-muted">
          {total} ta ovoz · {pct}% yoqdi
        </p>
      )}
    </div>
  );
}
