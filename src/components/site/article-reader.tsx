"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { List, Minus, Plus, Volume2, Pause, Languages } from "lucide-react";
import { PostContent } from "./post-content";

type Toc = { id: string; text: string; level: number };
type Tr = { title: string; html: string };

const SCALES = [0.9, 1, 1.12, 1.28];

export function ArticleReader({
  html,
  toc,
  translations,
  labels,
}: {
  html: string;
  toc: Toc[];
  translations: Record<string, Tr>;
  labels: {
    toc: string;
    listen: string;
    pause: string;
    original: string;
    translate: string;
  };
}) {
  const [scaleIdx, setScaleIdx] = useState(1);
  const [lang, setLang] = useState<string>("orig");
  const [activeId, setActiveId] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const trLangs = useMemo(() => Object.keys(translations || {}), [translations]);
  const current = lang === "orig" ? html : translations[lang]?.html || html;
  const showToc = lang === "orig" && toc.length >= 3;

  // Shrift o'lchamini eslab qolamiz
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("site_reading_scale"));
      if (Number.isFinite(saved) && saved >= 0 && saved < SCALES.length) setScaleIdx(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("site_reading_scale", String(scaleIdx));
    } catch {}
  }, [scaleIdx]);

  // Scrollspy — joriy sarlavhani aniqlash
  useEffect(() => {
    if (!showToc) return;
    const onScroll = () => {
      let cur = "";
      for (const t of toc) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= 120) cur = t.id;
      }
      setActiveId(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc, showToc]);

  // Ovoz bilan o'qish (brauzer TTS)
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);
  // Tarjima almashtirilsa o'qishni to'xtatamiz
  useEffect(() => {
    stopSpeak();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopSpeak() {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setSpeaking(false);
  }

  function toggleSpeak() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      stopSpeak();
      return;
    }
    const text = contentRef.current?.innerText?.trim();
    if (!text) return;
    synth.cancel();
    // Uzun matnni bo'laklab o'qiymiz (brauzer chegarasi ~32k)
    const chunks = text.match(/[^.!?]+[.!?]*/g)?.reduce<string[]>((acc, s) => {
      const last = acc[acc.length - 1];
      if (last && (last + s).length < 200) acc[acc.length - 1] = last + s;
      else acc.push(s);
      return acc;
    }, []) || [text];
    const voiceLang = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "ru-RU";
    let i = 0;
    const speakNext = () => {
      if (i >= chunks.length) {
        setSpeaking(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = voiceLang;
      u.rate = 1;
      u.onend = speakNext;
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    };
    setSpeaking(true);
    speakNext();
  }

  return (
    <div>
      {/* O'qish asboblari */}
      <div className="sticky top-2 z-30 mb-6 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
        <button
          onClick={toggleSpeak}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            speaking ? "bg-accent text-white" : "hover:bg-surface-2"
          }`}
        >
          {speaking ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {speaking ? labels.pause : labels.listen}
        </button>

        <span className="mx-0.5 h-4 w-px bg-border" />

        {/* Shrift o'lchami */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setScaleIdx((i) => Math.max(0, i - 1))}
            disabled={scaleIdx === 0}
            aria-label="Kichraytirish"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="px-1 text-xs font-semibold tabular-nums text-muted">Aa</span>
          <button
            onClick={() => setScaleIdx((i) => Math.min(SCALES.length - 1, i + 1))}
            disabled={scaleIdx === SCALES.length - 1}
            aria-label="Kattalashtirish"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tarjima */}
        {trLangs.length > 0 && (
          <>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Languages className="h-3.5 w-3.5 text-muted" />
            <button
              onClick={() => setLang("orig")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                lang === "orig" ? "bg-foreground text-background" : "hover:bg-surface-2"
              }`}
            >
              {labels.original}
            </button>
            {trLangs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
                  lang === l ? "bg-foreground text-background" : "hover:bg-surface-2"
                }`}
              >
                {l}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Mundarija (scrollspy) */}
      {showToc && (
        <nav className="mb-8 rounded-xl border border-border bg-surface-2/40 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
            <List className="h-4 w-4" /> {labels.toc}
          </p>
          <ul className="space-y-1">
            {toc.map((t) => (
              <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                <a
                  href={`#${t.id}`}
                  className={`text-sm transition-colors ${
                    activeId === t.id ? "font-medium text-accent" : "text-muted hover:text-accent"
                  }`}
                >
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div ref={contentRef} style={{ ["--reading-scale" as string]: String(SCALES[scaleIdx]) }}>
        <PostContent html={current} />
      </div>
    </div>
  );
}
