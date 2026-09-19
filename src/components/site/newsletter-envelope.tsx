"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";

// Maqola ichida (blog/<slug>) suzuvchi elementlar ko'rinmasin (o'qishga xalaqit
// bermasin) — tags/archive ro'yxatlari bundan mustasno.
function isArticlePage(pathname: string | null): boolean {
  const m = pathname?.match(/\/blog\/([^/]+)\/?$/);
  return !!m && !["tags", "archive"].includes(m[1]);
}

// Chap pastda suzuvchi oq qog'oz konvert. Bosilganda ustida newsletter kartasi
// ochiladi (otabek.io bilan 1:1). Escape bilan yopiladi.
export function NewsletterEnvelope({ channel }: { channel?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const pathname = usePathname();
  const hidden = isArticlePage(pathname);

  // Escape bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  if (hidden) return null;

  return (
    <>
      {/* Suzuvchi oq qog'oz konvert */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Newsletterga obuna"
        aria-expanded={open}
        className="group fixed bottom-5 left-4 z-40 transition-transform hover:-translate-y-1 sm:bottom-7 sm:left-[30px]"
      >
        <EnvelopeArt />
      </button>

      {/* Newsletter paneli — konvert ustida */}
      {open && (
        <>
          {/* fon (mobil uchun bosib yopish) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="np-pop fixed bottom-[105px] left-4 right-4 z-50 w-auto rounded-[22px] bg-white p-6 shadow-[0_15px_50px_rgba(0,0,0,0.14)] sm:right-auto sm:left-[30px] sm:w-[300px]"
            role="dialog"
            aria-label="Newsletter"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Yopish"
              className="absolute right-4 top-4 z-10 text-neutral-400 transition-colors hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Sariq sticky note */}
            <div
              aria-hidden
              className="note-pop absolute -top-6 left-4 z-0 h-[130px] w-[150px] rotate-6 bg-[#fdf6b2] p-4 text-[15px] leading-snug text-neutral-800 shadow-[0_10px_25px_rgba(0,0,0,0.12)]"
              style={{ fontFamily: "'Comic Sans MS','Segoe Print','Bradley Hand',cursive" }}
            >
              <span className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-red-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.35)]" />
              Taking a break
              <br />: )
            </div>

            {done ? (
              <div className="relative z-[1] pt-24">
                <h3 className="text-lg font-bold text-neutral-900">You&apos;re in 🎉</h3>
                <p className="mt-1.5 text-sm text-neutral-500">Rahmat! Yangi maqolalar emailingizga keladi.</p>
                <button onClick={() => setOpen(false)} className="mt-4 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white">Yopish</button>
              </div>
            ) : (
              <div className="relative z-[1] pt-24">
                <h3 className="text-[22px] font-bold tracking-tight text-neutral-900">Beyond the horizon</h3>
                <p className="mt-0.5 text-sm text-neutral-500">Join the waitlist</p>

                <form onSubmit={submit} className="mt-4">
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} className="hidden" aria-hidden />
                  <label className="text-xs font-medium text-neutral-500">Email</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@ozodbeck.uz"
                    className="mt-1 w-full rounded-lg bg-neutral-100 px-3.5 py-2.5 text-sm text-neutral-800 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-neutral-300"
                  />
                  {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#93b4f5] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Subscribe
                  </button>
                </form>

                {channel && (
                  <a href={channel} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-[#6b8fe0] hover:underline">
                    yoki Telegram kanalga o'tish →
                  </a>
                )}
                <p className="mt-3 flex items-center gap-1 text-[11px] text-neutral-400">
                  <Check className="h-3 w-3" /> Spam yo'q. Istalgan payt bekor qilasiz.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// Oq qog'oz konvert illustratsiyasi (SVG) + oltin muhr ("O").
function EnvelopeArt() {
  return (
    <svg width="100" height="70" viewBox="0 0 100 70" className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition-transform group-hover:rotate-[-2deg]">
      {/* tana */}
      <rect x="2" y="6" width="96" height="60" rx="6" fill="#ffffff" stroke="#e5e5e5" strokeWidth="1.5" />
      {/* pastki burmalar */}
      <path d="M3 63 L44 34 M97 63 L56 34" stroke="#e2e2e2" strokeWidth="1.5" fill="none" />
      {/* yuqori qopqoq */}
      <path d="M3 8 L50 40 L97 8" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1.5" strokeLinejoin="round" />
      {/* oltin muhr */}
      <circle cx="50" cy="35" r="11" fill="#f4cf55" stroke="#e6bd3c" strokeWidth="1" />
      <text x="50" y="39.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#8a6d1a" fontFamily="Georgia, serif">O</text>
    </svg>
  );
}
