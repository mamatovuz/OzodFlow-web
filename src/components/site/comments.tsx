"use client";

import { useState } from "react";
import { MessageCircle, Loader2, Send } from "lucide-react";

type Comment = { id: string; name: string; body: string; createdAt: string };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export function Comments({ postId, initial }: { postId: string; initial: Comment[] }) {
  const [comments] = useState<Comment[]>(initial);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 1 || body.trim().length < 2) {
      setError("Ism va izohni to'ldiring");
      return;
    }
    setSending(true);
    const res = await fetch("/api/site/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, name, body, website }),
    });
    setSending(false);
    if (res.ok) {
      setDone(true);
      setName("");
      setBody("");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Yuborilmadi");
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="h-5 w-5" /> Izohlar {comments.length > 0 && <span className="text-muted">({comments.length})</span>}
      </h2>

      {/* Ro'yxat */}
      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted">Hali izoh yo'q. Birinchi bo'lib fikr bildiring.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium leading-none">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{fmt(c.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Forma */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        {done ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Rahmat! Izohingiz yuborildi — tasdiqlangach ko'rinadi.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm font-medium">Fikr bildiring</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ismingiz"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            {/* honeypot — ko'rinmaydi */}
            <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Izohingiz..."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Yuborish
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
