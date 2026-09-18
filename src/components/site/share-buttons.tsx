"use client";

import { useState } from "react";
import { Send, Link2, Check, Share2 } from "lucide-react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function url() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  function copy() {
    navigator.clipboard?.writeText(url()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const tg = `https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(title)}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url())}&text=${encodeURIComponent(title)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-sm text-muted">
        <Share2 className="h-4 w-4" /> Ulashish:
      </span>
      <a
        href={tg}
        target="_blank"
        rel="noreferrer"
        className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Send className="h-4 w-4" /> Telegram
      </a>
      <a
        href={x}
        target="_blank"
        rel="noreferrer"
        className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        X
      </a>
      <button
        onClick={copy}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Nusxa olindi" : "Havola"}
      </button>
    </div>
  );
}
