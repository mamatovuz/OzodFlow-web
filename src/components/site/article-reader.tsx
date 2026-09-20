"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Volume2, Pause, Play, Languages, Loader2 } from "lucide-react";
import { PostContent } from "./post-content";
import { SideToc } from "./side-toc";
import { cueAtTime, mapWordTimings, type WordCue } from "@/lib/tts-timing";

type Toc = { id: string; text: string; level: number };
type Tr = { title: string; html: string };

const SCALES = [0.9, 1, 1.12, 1.28];
const StablePostContent = memo(PostContent);

export function ArticleReader({
  html,
  toc,
  translations,
  ttsOn,
  audioUrl,
  labels,
}: {
  html: string;
  toc: Toc[];
  translations: Record<string, Tr>;
  slug: string;
  ttsOn: boolean;
  audioUrl?: string | null;
  labels: { toc: string; listen: string; pause: string; original: string; translate: string };
}) {
  const [scaleIdx, setScaleIdx] = useState(1);
  const [lang, setLang] = useState<string>("orig");
  const contentRef = useRef<HTMLDivElement>(null);

  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [ttsError, setTtsError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);
  const savedCuesRef = useRef<WordCue[]>([]);
  const [syncUnavailable, setSyncUnavailable] = useState(false);
  const pausedRef = useRef(false);
  const sessionRef = useRef(0);
  const spokenTextRef = useRef("");
  const wordsRef = useRef<{ range: Range; end: number }[]>([]);
  const wordHighlightRef = useRef<{ clear(): void; add(range: Range): void } | null>(null);
  const [progress, setProgress] = useState(0);

  // Blocks only control scrolling; the highlight covers the spoken word.
  const blocksRef = useRef<{ el: HTMLElement; start: number; end: number }[]>([]);
  const totalCharsRef = useRef(1);
  const activeBlockRef = useRef<HTMLElement | null>(null);
  // Poll the audio clock, never estimate how quickly the voice reads.
  const hlTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trLangs = useMemo(() => Object.keys(translations || {}), [translations]);
  const current = lang === "orig" ? html : translations[lang]?.html || html;
  // Only the original text has an admin-created recording.
  const savedAudio = lang === "orig" ? audioUrl || null : null;

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

  const buildBlocks = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const selector = "p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th, figcaption";
    const blocks: { el: HTMLElement; start: number; end: number }[] = [];
    const words: typeof wordsRef.current = [];
    const parts: string[] = [];
    let pos = 0;
    const article = root.querySelector(".site-content");
    if (!article) return;
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent || parent.closest("button, script, style, [aria-hidden='true']")) continue;
      const el = parent.closest<HTMLElement>(selector) || parent;
      for (const match of node.data.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        const end = pos + match[0].length;
        words.push({ range, end });
        const last = blocks[blocks.length - 1];
        if (last?.el === el) last.end = end;
        else blocks.push({ el, start: pos, end });
        parts.push(match[0]);
        pos = end + 1;
      }
    }
    blocksRef.current = blocks;
    wordsRef.current = words;
    spokenTextRef.current = parts.join(" ");
    totalCharsRef.current = Math.max(1, pos - 1);
    const api = window as unknown as {
      Highlight?: new () => { clear(): void; add(range: Range): void };
      CSS?: { highlights?: Map<string, unknown> };
    };
    if (api.Highlight && api.CSS?.highlights) {
      const highlight = new api.Highlight();
      wordHighlightRef.current = highlight;
      api.CSS.highlights.set("article-tts-word", highlight);
    }
  }, []);

  const stopHlTimer = useCallback(() => {
    if (hlTimerRef.current) {
      clearInterval(hlTimerRef.current);
      hlTimerRef.current = null;
    }
  }, []);

  const clearHighlight = useCallback(() => {
    wordHighlightRef.current?.clear();
    const registry = (window.CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    registry?.delete("article-tts-word");
    activeBlockRef.current = null;
  }, []);

  const highlightAt = useCallback((fraction: number) => {
    const blocks = blocksRef.current;
    if (!blocks.length) return;
    const target = Math.max(0, Math.min(1, fraction)) * totalCharsRef.current;
    const word = wordsRef.current.find((item) => target < item.end) || wordsRef.current.at(-1);
    wordHighlightRef.current?.clear();
    if (word) wordHighlightRef.current?.add(word.range);
    setProgress(Math.round(Math.max(0, Math.min(1, fraction)) * 100));
    const b = blocks.find((x) => target < x.end) || blocks[blocks.length - 1];
    if (b.el === activeBlockRef.current) return;
    activeBlockRef.current = b.el;
    const r = b.el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 60) {
      b.el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  const stopAudio = useCallback(() => {
    abortRef.current = true;
    sessionRef.current += 1;
    pausedRef.current = false;
    setProgress(0);
    setSyncUnavailable(false);
    savedCuesRef.current = [];
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    stopHlTimer();
    clearHighlight();
    setAudioState("idle");
  }, [clearHighlight, stopHlTimer]);

  // Til almashsa yoki komponent yopilsa — to'xtatamiz
  useEffect(() => {
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, current, savedAudio, ttsOn]);
  useEffect(() => () => stopAudio(), [stopAudio]);

  function onSavedTime() {
    const a = audioRef.current;
    if (!a || a.paused || !Number.isFinite(a.duration) || !a.duration) return;
    if (pausedRef.current) return;
    const cue = cueAtTime(savedCuesRef.current, a.currentTime);
    if (cue) highlightAt(cue.charIndex / totalCharsRef.current);
    else wordHighlightRef.current?.clear();
    setProgress(Math.round(a.currentTime / a.duration * 100));
  }

  async function toggleListen() {
    if (!ttsOn || !savedAudio || audioState === "loading") return;
    const audio = audioRef.current;
    if (!audio) return;
    setTtsError("");
    const session = sessionRef.current;
    if (audioState === "playing") {
      pausedRef.current = true;
      audio.pause();
      setAudioState("paused");
      return;
    }
    if (audioState === "paused") {
      try {
        await audio.play();
        if (session !== sessionRef.current) return;
        pausedRef.current = false;
        setAudioState("playing");
      } catch {
        if (session !== sessionRef.current) return;
        setTtsError("Ovozni davom ettirib bo'lmadi. Qayta urinib ko'ring.");
      }
      return;
    }

    buildBlocks();
    abortRef.current = false;
    pausedRef.current = false;
    setAudioState("loading");
    savedCuesRef.current = [];
    // Only use metadata belonging to this admin-created recording.
    try {
      const response = await fetch(savedAudio + ".timings.json");
      if (response.ok) {
        const data = await response.json();
        if (session !== sessionRef.current) return;
        savedCuesRef.current = mapWordTimings(spokenTextRef.current, data.timings || []);
      }
    } catch { /* Legacy recordings still play without speculative highlighting. */ }
    if (session !== sessionRef.current) return;
    setSyncUnavailable(!savedCuesRef.current.length);
    try {
      audio.src = savedAudio;
      await audio.play();
      if (session !== sessionRef.current) return;
      setAudioState("playing");
      stopHlTimer();
      hlTimerRef.current = setInterval(onSavedTime, 50);
      onSavedTime();
    } catch {
      if (session !== sessionRef.current) return;
      stopAudio();
      setTtsError("Ovoz yuklanmadi. Qayta urinib ko'ring.");
    }
  }

  return (
    <div>
      <SideToc toc={toc} label={labels.toc} />

      {/* O'qish asboblari */}
      <div className="sticky top-2 z-30 mb-6 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
        {ttsOn && (
          <div className="flex items-center">
            {savedAudio ? <button
              onClick={toggleListen}
              disabled={audioState === "loading"}
              aria-busy={audioState === "loading"}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                audioState === "playing" ? "bg-accent text-white" : "hover:bg-surface-2"
              }`}
            >
              {audioState === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : audioState === "playing" ? (
                <Pause className="h-3.5 w-3.5" />
              ) : audioState === "paused" ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {audioState === "playing" ? labels.pause : audioState === "paused" ? "Davom ettirish" : audioState === "loading" ? "Yuklanmoqda…" : labels.listen}
            </button> : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted">
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hali ovoz qo‘shilmagan
              </span>
            )}

            <span className="mx-0.5 h-4 w-px bg-border" />
          </div>
        )}

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

      {audioState !== "idle" && (
        <div className="mb-5 flex items-center gap-3 text-xs text-muted">
          <div role="progressbar" aria-label="Ovozli o‘qish jarayoni" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-500/15">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular-nums">{progress}%{audioState === "paused" ? " · Pauza" : ""}</span>
        </div>
      )}
      {syncUnavailable && audioState !== "idle" && (
        <p className="mb-4 text-xs text-muted">Bu ovozda sinxron belgilash mavjud emas.</p>
      )}
      {ttsError && <p role="alert" className="mb-4 text-xs text-red-500">{ttsError}</p>}
      {/* Yashirin audio element (saqlangan yoki jonli) */}
      <audio
        ref={audioRef}
        onEnded={stopAudio}
        onTimeUpdate={onSavedTime}
        onError={() => {
          if (abortRef.current) return;
          // During loading, play() rejects and toggleListen handles the error.
          if (audioState === "loading") return;
          setTtsError("Ovoz yuklanmadi. Qayta urinib ko'ring.");
          stopAudio();
        }}
        className="hidden"
      />

      <div ref={contentRef} data-tts-state={audioState} style={{ ["--reading-scale" as string]: String(SCALES[scaleIdx]) }}>
        <StablePostContent html={current} />
      </div>
    </div>
  );
}
