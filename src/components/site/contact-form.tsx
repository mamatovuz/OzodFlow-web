"use client";

import { useState } from "react";
import { Loader2, Send, Check } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/site/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact, body, website }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Yuborilmadi");
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Check className="h-6 w-6" />
        </div>
        <p className="mt-3 font-medium">Xabaringiz yuborildi!</p>
        <p className="mt-1 text-sm text-muted">Tez orada javob beraman.</p>
      </div>
    );
  }

  const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-6">
      <p className="font-medium">Menga xabar yozing</p>
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ismingiz" required className={field} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram / email (ixtiyoriy)" className={field} />
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Xabaringiz..." required className={`${field} resize-y`} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Yuborish
      </button>
    </form>
  );
}
