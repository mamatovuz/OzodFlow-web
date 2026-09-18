"use client";

import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";

export function SubscribeForm({ channel }: { channel?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/site/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, website }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setEmail("");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
        <Mail className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">Yangi maqolalardan xabardor bo'ling</h3>
      <p className="mt-1 text-sm text-muted">Email qoldiring yoki Telegram kanalga obuna bo'ling.</p>

      {done ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Obuna bo'ldingiz. Rahmat!
        </p>
      ) : (
        <form onSubmit={submit} className="mx-auto mt-4 flex max-w-sm gap-2">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} className="hidden" aria-hidden />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Obuna"}
          </button>
        </form>
      )}

      {channel && (
        <a href={channel} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent hover:underline">
          yoki Telegram kanalga o'tish →
        </a>
      )}
    </div>
  );
}
