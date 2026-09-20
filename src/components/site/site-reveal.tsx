"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Scroll-reveal — `.sr` klassli elementlar ekranga kelganda silliq ochiladi.
// FAQAT ekran ostidagi (below-fold) elementlar yashiriladi — yuqoridagilar darrov
// ko'rinadi (miltillash yo'q). JS/IO bo'lmasa yoki reduced-motion — hammasi ko'rinadi.
export function SiteReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let io: IntersectionObserver | null = null;

    const t = setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(".sr:not(.sr-seen)"));
      const supported = "IntersectionObserver" in window;
      if (supported && !reduce) {
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                const el = e.target as HTMLElement;
                el.classList.remove("sr-hidden");
                el.classList.add("sr-in");
                io?.unobserve(el);
              }
            }
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
        );
      }
      const foldY = window.innerHeight * 0.92;
      for (const el of els) {
        el.classList.add("sr-seen");
        const belowFold = el.getBoundingClientRect().top > foldY;
        if (!io || !belowFold) {
          el.classList.add("sr-in"); // yuqorida yoki IO yo'q — darrov ko'rinadi
        } else {
          el.classList.add("sr-hidden");
          io.observe(el);
        }
      }
    }, 60);

    return () => {
      clearTimeout(t);
      io?.disconnect();
    };
  }, [pathname]);

  return null;
}
