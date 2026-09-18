"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, User } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

export function AskArticle({
  slug,
  labels,
}: {
  slug: string;
  labels: { title: string; placeholder: string; hint: string };
}) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = ["Qisqacha nima haqida?", "Asosiy xulosa nima?", "Menga foydasi bormi?"];

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setError("");
    setQ("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/site/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, question: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.data?.answer) {
        setMsgs((m) => [...m, { role: "ai", text: j.data.answer }]);
      } else {
        setError(j?.error || "Javob olinmadi");
      }
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-center gap-2 border-b border-accent/20 bg-accent/5 px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
          <Sparkles className="h-4 w-4 text-accent" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-none">{labels.title}</p>
          <p className="mt-1 text-xs text-muted">{labels.hint}</p>
        </div>
      </div>

      <div className="p-5">
        {msgs.length > 0 && (
          <div className="mb-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user" ? "bg-surface-2" : "bg-accent/15"
                  }`}
                >
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
                </span>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-foreground text-background" : "bg-surface-2"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                </span>
                <div className="flex items-center rounded-2xl bg-surface-2 px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              </div>
            )}
          </div>
        )}

        {msgs.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.placeholder}
            className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label="Yuborish"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </section>
  );
}
