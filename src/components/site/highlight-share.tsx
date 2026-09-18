"use client";

import { useEffect, useState } from "react";
import { Send, Twitter, Copy, Check } from "lucide-react";

// Maqola ichida matn belgilanganda chiqadigan mini ulashish oynasi.
export function HighlightShare({ url }: { url: string }) {
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onUp() {
      const s = window.getSelection();
      const text = s?.toString().trim() || "";
      if (!text || text.length < 8 || text.length > 400) {
        setSel(null);
        return;
      }
      // Belgilash maqola matni ichidami?
      const anchor = s?.anchorNode as Node | null;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (!el || !el.closest(".site-content")) {
        setSel(null);
        return;
      }
      const rect = s!.getRangeAt(0).getBoundingClientRect();
      setSel({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
      setCopied(false);
    }
    document.addEventListener("mouseup", onUp);
    document.addEventListener("selectionchange", () => {
      if (!window.getSelection()?.toString().trim()) setSel(null);
    });
    return () => document.removeEventListener("mouseup", onUp);
  }, []);

  if (!sel) return null;

  const quote = `"${sel.text}"`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(quote)}`;
  const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(quote)}`;

  return (
    <div
      className="fixed z-[70] flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-card"
      style={{ left: sel.x, top: sel.y }}
    >
      <a
        href={tg}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
        aria-label="Telegram"
      >
        <Send className="h-4 w-4 text-[#229ED9]" />
      </a>
      <a
        href={tw}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
        aria-label="X"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(`${quote} — ${url}`).then(() => {
            setCopied(true);
            setTimeout(() => setSel(null), 900);
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
        aria-label="Nusxa"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
