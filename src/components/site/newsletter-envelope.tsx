"use client";

import { useState } from "react";
import { Loader2, Check, X, Send } from "lucide-react";

// Chap pastda suzib turadigan konvert. Bosilganda obuna oynasi ochiladi
// (1–3 rasmlardek). Email saqlanadi va unga yangiliklar yuboriladi.
export function NewsletterEnvelope({ channel }: { channel?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/site/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setEmail("");
      } else {
        setErr(j?.error || "Xatolik. Qayta urinib ko'ring.");
      }
    } catch {
      setErr("Tarmoq xatosi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Suzuvchi konvert tugmasi */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Yangiliklarga obuna"
        className="float-y group fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-xl"
      >
        <EnvelopeIcon />
        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent" />
        </span>
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Obuna bo'ling ✉️
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="modal-overlay fixed inset-0 z-[70] flex items-end justify-start bg-black/50 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal-pop relative w-full max-w-sm overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* dekorativ rangli halo */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-violet-400/15 blur-3xl" />

            {/* Yopishqoq qog'oz (sticky note) — o'ynoqi bezak */}
            <div
              aria-hidden
              className="note-pop pointer-events-none absolute -top-5 right-10 z-0 h-24 w-28 -rotate-6 bg-yellow-200 p-3 text-[13px] leading-tight text-neutral-800 shadow-lg"
              style={{ fontFamily: "'Comic Sans MS', 'Segoe Print', cursive" }}
            >
              {/* qizil to'g'nog'ich */}
              <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-red-500 shadow-[inset_0_-2px_3px_rgba(0,0,0,0.3)]" />
              Har hafta bitta xat :)
            </div>

            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="float-y flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <EnvelopeIcon />
            </div>

            {done ? (
              <div className="mt-4">
                <h3 className="text-lg font-bold tracking-tight">Obuna bo'ldingiz 🎉</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Rahmat! Yangi maqolalar chiqqanda birinchilardan bo'lib emailingizga xabar boradi.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background"
                >
                  Yopish
                </button>
              </div>
            ) : (
              <>
                <h3 className="mt-4 text-lg font-bold tracking-tight">Yangiliklardan xabardor bo'ling</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Emailingizni qoldiring — yangi maqola va e'lonlar to'g'ridan-to'g'ri sizga keladi.
                </p>

                <form onSubmit={submit} className="mt-4">
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    className="hidden"
                    aria-hidden
                  />
                  <label className="text-xs font-medium text-muted">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siz@example.com"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                  {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Obuna bo'lish
                  </button>
                </form>

                {channel && (
                  <a
                    href={channel}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block text-center text-xs text-accent hover:underline"
                  >
                    yoki Telegram kanalga o'tish →
                  </a>
                )}
                <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted">
                  <Check className="h-3 w-3" /> Spam yo'q. Istalgan payt bekor qilasiz.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 6l9 7 9-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
