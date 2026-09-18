"use client";

import { useEffect, useState } from "react";

type ReactionKey = "heart" | "fire" | "idea" | "wow" | "clap";
type Counts = Record<ReactionKey, number>;

const EMOJI: { key: ReactionKey; char: string; label: string }[] = [
  { key: "heart", char: "❤️", label: "Yoqdi" },
  { key: "fire", char: "🔥", label: "Zo'r" },
  { key: "idea", char: "💡", label: "Foydali" },
  { key: "wow", char: "😮", label: "Hayratlandim" },
  { key: "clap", char: "👏", label: "Bravo" },
];

export function PostReactions({
  slug,
  initialReactions,
}: {
  slug: string;
  initialReactions: Counts;
}) {
  const key = `ozod-react-${slug}`;
  const [counts, setCounts] = useState<Counts>(initialReactions);
  const [vote, setVote] = useState<ReactionKey | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key) as ReactionKey | null;
      if (v && EMOJI.some((e) => e.key === v)) setVote(v);
    } catch {}
  }, [key]);

  async function react(emoji: ReactionKey) {
    if (busy) return;
    setBusy(true);
    const prev = vote;
    // Optimistik yangilash — darhol sezilsin
    setCounts((c) => {
      const next = { ...c };
      if (prev === emoji) next[emoji] = Math.max(0, next[emoji] - 1);
      else {
        if (prev) next[prev] = Math.max(0, next[prev] - 1);
        next[emoji] += 1;
      }
      return next;
    });
    setVote(prev === emoji ? null : emoji);
    try {
      const res = await fetch("/api/site/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, emoji, prev }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCounts(json.data.reactions);
        setVote(json.data.vote);
        try {
          if (json.data.vote) localStorage.setItem(key, json.data.vote);
          else localStorage.removeItem(key);
        } catch {}
      }
    } catch {}
    setBusy(false);
  }

  const total = EMOJI.reduce((s, e) => s + (counts[e.key] || 0), 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted">Maqola qanday taassurot qoldirdi?</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {EMOJI.map((e) => {
          const active = vote === e.key;
          return (
            <button
              key={e.key}
              onClick={() => react(e.key)}
              disabled={busy}
              aria-pressed={active}
              title={e.label}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-60 ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-foreground hover:text-foreground"
              }`}
            >
              <span className={`text-base transition-transform ${active ? "scale-110" : ""}`}>{e.char}</span>
              {counts[e.key] > 0 && <span>{counts[e.key]}</span>}
            </button>
          );
        })}
      </div>
      {total > 0 && <p className="text-xs text-muted">{total} ta reaksiya</p>}
    </div>
  );
}
