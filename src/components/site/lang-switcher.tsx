"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Languages } from "lucide-react";

const LANGS = [
  { key: "uz", label: "O'zbek" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

export function LangSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function pick(lang: string) {
    document.cookie = `site_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Til"
        className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <Languages className="h-4 w-4" />
        <span className="uppercase">{current}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-border bg-card shadow-card">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => pick(l.key)}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                  current === l.key ? "font-semibold text-foreground" : "text-muted"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
