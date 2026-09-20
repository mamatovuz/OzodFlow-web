"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Scroll-reveal — `.sr` klassli elementlar ekranga kelganda silliq ochiladi.
// Sahifa almashsa (Next Link) yangi elementlarni ham kuzatadi. JS bo'lmasa
// yoki reduced-motion bo'lsa — hammasi ko'rinadi (kontent yashirin qolmaydi).
export function SiteReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.add("sr-ready");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scan = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(".sr:not(.sr-in)"));
      if (reduce || !("IntersectionObserver" in window)) {
        els.forEach((e) => e.classList.add("sr-in"));
        return null;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("sr-in");
              io.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      els.forEach((e) => io.observe(e));
      return io;
    };

    // DOM tayyor bo'lishi uchun kichik kechikish (sahifa almashganda)
    const t = setTimeout(() => {
      const io = scan();
      cleanup = () => io?.disconnect();
    }, 60);
    let cleanup: (() => void) | null = null;
    return () => {
      clearTimeout(t);
      cleanup?.();
    };
  }, [pathname]);

  return null;
}
