"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────
// Mijozlar uchun menyu yordamchisi (restoran AI kaliti bilan).
// 3 uslub: bubble (dumaloq tugma), minimal (nozik pill), bar (pastki panel).
// Maxfiylik: server faqat menyu bo'yicha javob beradi.
// ─────────────────────────────────────────────

type Item = { name: string; price: number; image: string | null };
type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "ai"; text: string; items: Item[] };

const uid = () => Math.random().toString(36).slice(2);
const money = (n: number) => n.toLocaleString("uz-UZ").replace(/,/g, " ");

const SUGGESTIONS = ["50 000 so'mga nima yeyish mumkin?", "Nima maslahat berasiz?", "Yengil biror narsa"];

export function MenuAssistant({
  slug,
  accent,
  accentText,
  currency = "so'm",
  style = "bubble",
}: {
  slug: string;
  accent: string;
  accentText: string;
  currency?: string;
  style?: string;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((p) => [...p, { id: uid(), role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/menu-assistant/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const json = await res.json();
      const reply = json?.data?.reply || json?.error || "Javob yo'q.";
      setMsgs((p) => [...p, { id: uid(), role: "ai", text: reply, items: json?.data?.items || [] }]);
    } catch {
      setMsgs((p) => [...p, { id: uid(), role: "ai", text: "Ulanishда xatolik.", items: [] }]);
    }
    setBusy(false);
  }

  return (
    <>
      {!open && <Trigger style={style} accent={accent} accentText={accentText} onClick={() => setOpen(true)} />}

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] flex flex-col bg-card shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:rounded-2xl sm:border sm:border-border"
          style={{ height: "min(80vh, 600px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent, color: accentText }}>
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-foreground">Menyu yordamchisi</p>
            </div>
            <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div>
                <p className="text-sm text-muted">Nima yeyishni bilmayapsizmi? So'rang — men mos taom tavsiya qilaman.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:border-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm" style={{ background: accent, color: accentText }}>
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex flex-col items-start gap-2">
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-2 text-sm text-foreground">
                    {m.text}
                  </div>
                  {m.items.length > 0 && (
                    <div className="flex w-full flex-col gap-1.5">
                      {m.items.map((it) => (
                        <div key={it.name} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt={it.name} className="h-11 w-11 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
                              <Sparkles className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                            <p className="text-xs font-semibold" style={{ color: accent }}>
                              {money(it.price)} {currency}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> O'ylayapman...
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Masalan: 40 mingga nima bor?"
                className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
                style={{ background: accent, color: accentText }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Trigger({
  style,
  accent,
  accentText,
  onClick,
}: {
  style: string;
  accent: string;
  accentText: string;
  onClick: () => void;
}) {
  const safe = { bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" };

  if (style === "minimal") {
    return (
      <button
        onClick={onClick}
        className="fixed right-4 z-[55] flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-md"
        style={safe}
      >
        <Sparkles className="h-4 w-4" style={{ color: accent }} /> Yordamchi
      </button>
    );
  }

  if (style === "bar") {
    return (
      <button
        onClick={onClick}
        className="fixed inset-x-3 z-[55] flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg sm:inset-x-auto sm:right-4 sm:w-auto"
        style={{ ...safe, background: accent, color: accentText }}
      >
        <Sparkles className="h-4 w-4" /> Nima yeyishni bilmayapsizmi? So'rang
      </button>
    );
  }

  // bubble (default)
  return (
    <button
      onClick={onClick}
      aria-label="Menyu yordamchisi"
      className="fixed right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 active:scale-95"
      style={{ ...safe, background: accent, color: accentText }}
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
