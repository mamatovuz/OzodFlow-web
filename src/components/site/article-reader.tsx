"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Volume2, Pause, Play, Languages, Loader2, ChevronDown } from "lucide-react";
import { PostContent } from "./post-content";
import { SideToc } from "./side-toc";

type Toc = { id: string; text: string; level: number };
type Tr = { title: string; html: string };
type Voice = { id: string; name: string; gender?: string; short?: string };

const SCALES = [0.9, 1, 1.12, 1.28];
const StablePostContent = memo(PostContent);

// Matnni ≤1200 baytli jumla bo'laklariga bo'ladi (jonli TTS uchun)
function splitChunks(text: string, maxBytes = 1200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const enc = new TextEncoder();
  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (enc.encode(cur + s).length > maxBytes) {
      if (cur.trim()) out.push(cur.trim());
      if (enc.encode(s).length > maxBytes) {
        let piece = "";
        for (const w of s.split(" ")) {
          if (enc.encode(`${piece} ${w}`).length > maxBytes) {
            if (piece.trim()) out.push(piece.trim());
            piece = w;
          } else piece = piece ? `${piece} ${w}` : w;
        }
        cur = piece;
      } else cur = s;
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function ArticleReader({
  html,
  toc,
  translations,
  slug,
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string>("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [usingBrowser, setUsingBrowser] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const prefetchRef = useRef<Map<number, string>>(new Map());
  const abortRef = useRef(false);
  const browserRef = useRef(false);
  const pausedRef = useRef(false);
  const sessionRef = useRef(0);
  const spokenTextRef = useRef("");
  const wordsRef = useRef<{ range: Range; end: number }[]>([]);
  const wordHighlightRef = useRef<{ clear(): void; add(range: Range): void } | null>(null);
  const [progress, setProgress] = useState(0);

  // Karaoke: matn bloklari (o'qilayotgan blok ko'k bo'ladi)
  const blocksRef = useRef<{ el: HTMLElement; start: number; end: number }[]>([]);
  const totalCharsRef = useRef(1);
  const activeBlockRef = useRef<HTMLElement | null>(null);
  // Brauzer ovozida vaqtga asoslangan yoritish taymeri (iOS'da onboundary ishlamaydi)
  const hlTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trLangs = useMemo(() => Object.keys(translations || {}), [translations]);
  const current = lang === "orig" ? html : translations[lang]?.html || html;
  const ttsLang = lang === "ru" ? "ru" : lang === "en" ? "en" : "uz";
  // Saqlangan ovoz faqat asl (orig) matn uchun — tarjimalar jonli o'qiladi
  const savedAudio = lang === "orig" ? audioUrl || null : null;

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("site_reading_scale"));
      if (Number.isFinite(saved) && saved >= 0 && saved < SCALES.length) setScaleIdx(saved);
      const v = localStorage.getItem("site_tts_voice");
      if (v) setVoiceId(v);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("site_reading_scale", String(scaleIdx));
    } catch {}
  }, [scaleIdx]);

  // Jonli rejim uchun ovozlar ro'yxati (saqlangan ovoz bo'lmasa)
  useEffect(() => {
    if (!ttsOn || savedAudio) return;
    let cancelled = false;
    fetch(`/api/site/tts/voices?lang=${ttsLang}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const vs: Voice[] = j?.data?.voices || [];
        setVoices(vs);
        setVoiceId((prev) => (vs.some((v) => v.id === prev) ? prev : vs[0]?.id || ""));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ttsLang, ttsOn, savedAudio]);

  // ── Karaoke yoritish ──
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
    if (activeBlockRef.current) {
      activeBlockRef.current.classList.remove("tts-reading");
      activeBlockRef.current.style.removeProperty("--tts-progress");
    }
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
    b.el.style.setProperty("--tts-progress", `${Math.max(0, Math.min(1, (target - b.start) / (b.end - b.start))) * 100}%`);
    if (b.el === activeBlockRef.current) return;
    if (activeBlockRef.current) activeBlockRef.current.classList.remove("tts-reading");
    b.el.classList.add("tts-reading");
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
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    prefetchRef.current.forEach((url) => URL.revokeObjectURL(url));
    prefetchRef.current.clear();
    idxRef.current = 0;
    stopHlTimer();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    browserRef.current = false;
    setUsingBrowser(false);
    clearHighlight();
    setAudioState("idle");
  }, [clearHighlight, stopHlTimer]);

  // Til almashsa yoki komponent yopilsa — to'xtatamiz
  useEffect(() => {
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, current, savedAudio, ttsOn]);
  useEffect(() => () => stopAudio(), [stopAudio]);

  const highlightChunk = useCallback((index: number, within: number) => {
    const offset = chunksRef.current.slice(0, index).reduce((sum, text) => sum + text.length + 1, 0);
    highlightAt((offset + (chunksRef.current[index]?.length || 0) * within) / totalCharsRef.current);
  }, [highlightAt]);

  // ── Brauzer ovozi (zaxira) ──
  const pickBrowserVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const all = window.speechSynthesis.getVoices();
    if (!all.length) return null;
    const order = ttsLang === "ru" ? ["ru"] : ttsLang === "en" ? ["en"] : ["uz", "az", "tr", "ru"];
    for (const pref of order) {
      const v = all.find((x) => x.lang?.toLowerCase().startsWith(pref));
      if (v) return v;
    }
    return all[0];
  }, [ttsLang]);

  const speakBrowser = useCallback(
    (from: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
      const synth = window.speechSynthesis;
      const session = sessionRef.current;
      const voice = pickBrowserVoice();
      const total = chunksRef.current.length;
      browserRef.current = true;
      setUsingBrowser(true);
      setAudioState("playing");

      const speakAt = (i: number) => {
        if (session !== sessionRef.current) return;
        if (abortRef.current || i >= total) {
          if (i >= total) stopAudio();
          return;
        }
        idxRef.current = i;
        const text = chunksRef.current[i];
        const u = new SpeechSynthesisUtterance(text);
        if (voice) u.voice = voice;
        u.lang = voice?.lang || (ttsLang === "ru" ? "ru-RU" : ttsLang === "en" ? "en-US" : "uz-UZ");
        u.rate = 1;
        // Bo'lak ichidagi eng katta (monotonik oldinga) o'qilgan ulush
        let within = 0;
        const setWithin = (w: number) => {
          within = Math.max(within, Math.min(1, w));
          highlightChunk(i, within);
        };
        // Use real boundaries when available; otherwise estimate active speaking time.
        let lastTick = performance.now();
        let elapsed = 0;
        let started = false;
        let hasBoundary = false;
        const durMs = Math.max(1400, (text.length / 13) * 1000);
        stopHlTimer();
        setWithin(0);
        hlTimerRef.current = setInterval(() => {
          const now = performance.now();
          const delta = now - lastTick;
          lastTick = now;
          if (!started || pausedRef.current || session !== sessionRef.current) return;
          elapsed += delta;
          if (!hasBoundary) setWithin(Math.min(0.98, elapsed / durMs));
        }, 120);
        u.onstart = () => {
          started = true;
          lastTick = performance.now();
        };
        u.onboundary = (e) => {
          if (pausedRef.current || session !== sessionRef.current) return;
          hasBoundary = true;
          within = (e.charIndex || 0) / Math.max(1, text.length);
          highlightChunk(i, within);
        };
        u.onend = () => {
          if (session !== sessionRef.current) return;
          stopHlTimer();
          if (!abortRef.current) speakAt(i + 1);
        };
        u.onerror = () => {
          if (session !== sessionRef.current || abortRef.current) return;
          stopAudio();
          setTtsError("Ovozli o'qishda xatolik yuz berdi. Qayta urinib ko'ring.");
        };
        synth.speak(u);
      };
      synth.cancel();
      speakAt(from);
      return true;
    },
    [pickBrowserVoice, stopAudio, stopHlTimer, ttsLang, highlightChunk]
  );

  // ── Jonli server TTS (bo'lak-bo'lak) ──
  async function fetchChunk(i: number): Promise<string | null> {
    const session = sessionRef.current;
    const cached = prefetchRef.current.get(i);
    if (cached) return cached;
    const text = chunksRef.current[i];
    if (!text) return null;
    const res = await fetch("/api/site/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, text, lang: ttsLang, voice: voiceId || undefined }),
    });
    if (!res.ok) throw new Error("tts");
    const blob = await res.blob();
    if (session !== sessionRef.current || abortRef.current) return null;
    const existing = prefetchRef.current.get(i);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    prefetchRef.current.set(i, url);
    return url;
  }

  async function playLiveFrom(i: number) {
    const session = sessionRef.current;
    if (abortRef.current) return;
    const a = audioRef.current;
    if (!a) return;
    const total = chunksRef.current.length;
    if (i >= total) {
      stopAudio();
      return;
    }
    idxRef.current = i;
    setAudioState("loading");
    try {
      const url = await fetchChunk(i);
      if (!url || abortRef.current || session !== sessionRef.current) return;
      a.src = url;
      await a.play();
      if (session !== sessionRef.current) return;
      setAudioState("playing");
      highlightChunk(i, 0);
      fetchChunk(i + 1).catch(() => {});
    } catch {
      if (session !== sessionRef.current || abortRef.current) return;
      if (!abortRef.current && speakBrowser(i)) return;
      setTtsError("Ovozli o'qish hozir mavjud emas.");
      stopAudio();
    }
  }

  function onLiveEnded() {
    if (abortRef.current || browserRef.current) return;
    const done = idxRef.current;
    const url = prefetchRef.current.get(done);
    if (url) {
      URL.revokeObjectURL(url);
      prefetchRef.current.delete(done);
    }
    playLiveFrom(done + 1);
  }

  // Jonli rejim uchun audio elementining vaqti bo'yicha yoritish
  function onLiveTime() {
    if (browserRef.current || savedAudio) return;
    const a = audioRef.current;
    const total = chunksRef.current.length;
    if (!a || a.paused || !Number.isFinite(a.duration) || !a.duration || !total) return;
    highlightChunk(idxRef.current, a.currentTime / a.duration);
  }

  // Saqlangan ovoz vaqti bo'yicha yoritish
  function onSavedTime() {
    const a = audioRef.current;
    if (!a || a.paused || !Number.isFinite(a.duration) || !a.duration) return;
    highlightAt(a.currentTime / a.duration);
  }

  async function toggleListen() {
    if (!ttsOn || audioState === "loading") return;
    setTtsError("");

    if (audioState === "playing") {
      pausedRef.current = true;
      if (browserRef.current && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.pause();
        } catch {}
        // The clock excludes paused time and resumes from the same position.
      } else audioRef.current?.pause();
      setAudioState("paused");
      return;
    }
    if (audioState === "paused") {
      const session = sessionRef.current;
      try {
        if (browserRef.current && "speechSynthesis" in window) {
          window.speechSynthesis.resume();
        } else await audioRef.current?.play();
        if (session !== sessionRef.current) return;
        pausedRef.current = false;
        setAudioState("playing");
      } catch {
        setTtsError("Ovozni davom ettirib bo'lmadi. Qayta urinib ko'ring.");
      }
      return;
    }

    // Boshlash
    buildBlocks();
    abortRef.current = false;
    pausedRef.current = false;
    const session = sessionRef.current;
    highlightAt(0);

    // 1) Saqlangan ovoz (bir marta yaratilган mp3) — eng silliq
    if (savedAudio && audioRef.current) {
      const a = audioRef.current;
      setAudioState("loading");
      a.src = savedAudio;
      try {
        await a.play();
        if (session !== sessionRef.current) return;
        setAudioState("playing");
      } catch {
        if (session !== sessionRef.current) return;
        setTtsError("Ovoz yuklanmadi.");
        stopAudio();
      }
      return;
    }

    // 2) Jonli rejim (bo'lak-bo'lak)
    const text = spokenTextRef.current;
    if (!text) return;
    chunksRef.current = splitChunks(text, 1200);
    if (chunksRef.current.length === 0) return;
    prefetchRef.current.clear();
    setAudioState("loading");
    await playLiveFrom(0);
  }

  const selectedVoice = voices.find((v) => v.id === voiceId);
  const showVoicePicker = !savedAudio && voices.length > 1;

  return (
    <div>
      <SideToc toc={toc} label={labels.toc} />

      {/* O'qish asboblari */}
      <div className="sticky top-2 z-30 mb-6 flex flex-wrap items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
        {ttsOn && (
          <div className="flex items-center">
            <button
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
            </button>

            {showVoicePicker && (
              <div className="relative">
                <button
                  onClick={() => setVoiceOpen((v) => !v)}
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-1.5 text-[11px] text-muted hover:bg-surface-2"
                  title="Ovozni tanlash"
                >
                  {selectedVoice ? selectedVoice.name.split(" ")[0] : "Ovoz"}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {voiceOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setVoiceOpen(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-card">
                      {voices.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setVoiceId(v.id);
                            try {
                              localStorage.setItem("site_tts_voice", v.id);
                            } catch {}
                            stopAudio();
                            setVoiceOpen(false);
                          }}
                          className={`block w-full px-3 py-2 text-left text-xs hover:bg-surface-2 ${v.id === voiceId ? "text-accent" : ""}`}
                        >
                          <span className="font-medium">{v.name}</span>
                          {v.short && <span className="block truncate text-[10px] text-muted">{v.short}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
      {ttsError && <p role="alert" className="mb-4 text-xs text-red-500">{ttsError}</p>}
      {usingBrowser && (audioState === "playing" || audioState === "paused") && (
        <p className="mb-4 text-xs text-muted">Brauzer ovozi bilan o'qilmoqda.</p>
      )}

      {/* Yashirin audio element (saqlangan yoki jonli) */}
      <audio
        ref={audioRef}
        onEnded={() => (savedAudio ? stopAudio() : onLiveEnded())}
        onTimeUpdate={() => (savedAudio ? onSavedTime() : onLiveTime())}
        onError={() => {
          if (abortRef.current || browserRef.current) return;
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
