"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

type FaqItem = { q: string; a: string };

export function FaqSection({ items, title }: { items: FaqItem[]; title: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
        <HelpCircle className="h-5 w-5 text-accent" /> {title}
      </h2>
      <div className="space-y-2">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/50"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 py-3.5 text-sm leading-relaxed text-muted">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
