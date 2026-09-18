"use client";

import { useEffect, useRef } from "react";

// Maqola matnini ko'rsatadi + kod bloklarini ranglaydi (highlight.js) va
// har kod blokiga "nusxa olish" tugmasini qo'shadi.
export function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

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
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return <div ref={ref} className="site-content" dangerouslySetInnerHTML={{ __html: html }} />;
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
