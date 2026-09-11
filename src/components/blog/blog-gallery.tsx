"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

// Blog maqolasi rasmlari:
//  • Yuqorida — avtomatik almashib turadigan preview (slayder)
//  • Har qanday rasmga bosilsa — to'liq ekran lightbox (kattalashtirib ko'rish)
export function BlogGallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null); // ochiq bo'lsa — indeks
  const many = images.length > 1;

  const go = useCallback(
    (dir: number) => setIdx((i) => (i + dir + images.length) % images.length),
    [images.length]
  );

  // Preview avtomatik aylanadi (lightbox ochiq bo'lmasa, 1 tadan ko'p bo'lsa)
  useEffect(() => {
    if (!many || lightbox !== null) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 4500);
    return () => clearInterval(t);
  }, [many, lightbox, images.length]);

  // Lightbox — klaviatura (Esc yopadi, strelkalar almashtiradi)
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % images.length));
      else if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    // Lightbox ochiqda sahifa scroll bo'lmasin
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  if (images.length === 0) return null;

  return (
    <div className="mt-6">
      {/* ─── Yuqori preview (avtomatik slayder) ─── */}
      <div
        className="group relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-surface-2"
        onMouseEnter={undefined}
      >
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label="Rasmni kattalashtirish"
            className={`absolute inset-0 h-full w-full cursor-zoom-in transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={`${title} — ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}

        {/* Kattalashtirish belgisi (hoverда) */}
        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>

        {/* Strelkalar (1 tadan ko'p bo'lsa) */}
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Oldingi"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Keyingi"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Nuqtalar */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`${i + 1}-rasm`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Kichik rasmlar (thumbnail) qatori ─── */}
      {many && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              onDoubleClick={() => setLightbox(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === idx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${title} — ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ─── Lightbox (to'liq ekran kattalashtirish) ─── */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          {/* Yopish */}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Yopish"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Rasm */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox]}
            alt={`${title} — ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />

          {/* Navigatsiya */}
          {many && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i - 1 + images.length) % images.length)); }}
                aria-label="Oldingi"
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i + 1) % images.length)); }}
                aria-label="Keyingi"
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                {lightbox + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
