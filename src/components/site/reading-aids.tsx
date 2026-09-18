"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// O'qish progress bari (tepada) + "tepaga" tugmasi.
export function ReadingAids() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      setProgress(p);
      setShowTop(h.scrollTop > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed left-0 top-0 z-50 h-0.5 bg-accent transition-[width] duration-100" style={{ width: `${progress}%` }} />
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Tepaga"
          className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-card transition-colors hover:border-foreground"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
