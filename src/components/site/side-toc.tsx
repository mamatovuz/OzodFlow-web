"use client";

import { useEffect, useRef, useState } from "react";
import { List, X } from "lucide-react";

type Toc = { id: string; text: string; level: number };

// Maqola mundarijasi — chekada (chapda) suzuvchi tugma. Bosilsa panel ochiladi,
// yana bossa yopiladi. Scrollspy bilan joriy bo'lim ajratiladi.
export function SideToc({ toc, label = "Mundarija" }: { toc: Toc[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Scrollspy
  useEffect(() => {
    const onScroll = () => {
      let cur = "";
      for (const t of toc) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= 130) cur = t.id;
      }
      setActiveId(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  // Tashqariga bosilsa yopiladi
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function goto(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setOpen(false);
  }

  if (toc.length < 3) return null;

  return (
    <div ref={ref} className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      {/* Toggle tugma */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted shadow-card transition-all hover:-translate-y-0.5 hover:text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
      </button>

      {/* Panel */}
      {open && (
        <nav className="toc-pop absolute left-14 top-1/2 max-h-[70vh] w-64 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <List className="h-3.5 w-3.5" /> {label}
          </p>
          <ul className="space-y-0.5">
            {toc.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => goto(t.id)}
                  className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                    t.level === 3 ? "pl-5 text-[13px]" : ""
                  } ${activeId === t.id ? "font-medium text-accent" : "text-muted hover:text-foreground"}`}
                >
                  {t.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
