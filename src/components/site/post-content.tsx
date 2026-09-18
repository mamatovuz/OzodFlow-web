"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Maqola matnini ko'rsatadi + kod bloklarini ranglaydi (highlight.js),
// har kod blokiga "nusxa olish" tugmasini qo'shadi, rasmlarni bosganda kattalashtiradi.
export function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const root = ref.current;
      if (!root) return;

      const blocks = root.querySelectorAll<HTMLElement>("pre code");
      if (blocks.length) {
        await ensureHljs();
        if (cancelled) return;
        const hljs = (window as unknown as { hljs?: { highlightElement: (el: HTMLElement) => void } }).hljs;
        blocks.forEach((code) => {
          try {
            hljs?.highlightElement(code);
          } catch {}
          addCopyButton(code);
        });
      }

      // Rasmlarni bosilganda kattalashtirish
      root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        img.style.cursor = "zoom-in";
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [html]);

  function onClick(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === "IMG") setZoom((t as HTMLImageElement).src);
  }

  return (
    <>
      <div ref={ref} className="site-content" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button className="absolute right-4 top-4 text-white/80 hover:text-white" aria-label="Yopish">
            <X className="h-7 w-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}

function addCopyButton(code: HTMLElement) {
  const pre = code.closest("pre");
  if (!pre || pre.querySelector(".code-copy")) return;
  pre.classList.add("code-pre");
  const btn = document.createElement("button");
  btn.className = "code-copy";
  btn.type = "button";
  btn.textContent = "Nusxa";
  btn.addEventListener("click", () => {
    navigator.clipboard?.writeText(code.innerText).then(() => {
      btn.textContent = "✓ Olindi";
      setTimeout(() => (btn.textContent = "Nusxa"), 1500);
    });
  });
  pre.appendChild(btn);
}

let hljsPromise: Promise<void> | null = null;
function ensureHljs(): Promise<void> {
  if (hljsPromise) return hljsPromise;
  hljsPromise = new Promise<void>((resolve) => {
    // CSS mavzu (bir marta)
    if (!document.getElementById("hljs-theme")) {
      const link = document.createElement("link");
      link.id = "hljs-theme";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
      document.head.appendChild(link);
    }
    if ((window as unknown as { hljs?: unknown }).hljs) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return hljsPromise;
}
