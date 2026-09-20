"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Volume2, Pause, Play, Languages, Loader2, ChevronDown } from "lucide-react";
import { PostContent } from "./post-content";
import { SideToc } from "./side-toc";

type Toc = { id: string; text: string; level: number };
type Tr = { title: string; html: string };
type Voice = { id: string; name: string; gender?: string; short?: string };

const SCALES = [0.9, 1, 1.12, 1.28];

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
    const els = Array.from(root.querySelectorAll<HTMLElement>("p, li, h2, h3, blockquote, pre"));
    const blocks: { el: HTMLElement; start: number; end: number }[] = [];
    let pos = 0;
    for (const el of els) {
      const len = (el.textContent || "").trim().length;
      if (len < 2) continue;
      blocks.push({ el, start: pos, end: pos + len });
      pos += len;
    }
    blocksRef.current = blocks;
    totalCharsRef.current = Math.max(1, pos);
  }, []);

  const stopHlTimer = useCallback(() => {
    if (hlTimerRef.current) {
      clearInterval(hlTimerRef.current);
      hlTimerRef.current = null;
    }
  }, []);

  const clearHighlight = useCallback(() => {
    if (activeBlockRef.current) activeBlockRef.current.classList.remove("tts-reading");
    activeBlockRef.current = null;
  }, []);

  const highlightAt = useCallback((fraction: number) => {
    const blocks = blocksRef.current;
    if (!blocks.length) return;
    const target = Math.max(0, Math.min(1, fraction)) * totalCharsRef.current;
    const b = blocks.find((x) => target >= x.start && target < x.end) || blocks[blocks.length - 1];
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
  }, [lang]);
  useEffect(() => () => stopAudio(), [stopAudio]);

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
      const voice = pickBrowserVoice();
      const total = chunksRef.current.length;
      browserRef.current = true;
      setUsingBrowser(true);
      setAudioState("playing");

      const speakAt = (i: number) => {
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
          highlightAt((i + within) / total);
        };
        u.onstart = () => {
          const startedAt = performance.now();
          // Taxminiy davomiylik: ~13 belgi/sek (onboundary ishlamasa — iOS)
          const durMs = Math.max(1200, (text.length / 13) * 1000);
          stopHlTimer();
          setWithin(0);
          hlTimerRef.current = setInterval(() => {
            setWithin((performance.now() - startedAt) / durMs);
          }, 130);
        };
        u.onboundary = (e) => setWithin((e.charIndex || 0) / Math.max(1, text.length));
        u.onend = () => {
          stopHlTimer();
          if (!abortRef.current) speakAt(i + 1);
        };
        u.onerror = () => {
          stopHlTimer();
          if (!abortRef.current) speakAt(i + 1);
        };
        synth.speak(u);
      };
      synth.cancel();
      speakAt(from);
      return true;
    },
    [pickBrowserVoice, stopAudio, stopHlTimer, ttsLang, highlightAt]
  );

  // ── Jonli server TTS (bo'lak-bo'lak) ──
  async function fetchChunk(i: number): Promise<string | null> {
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
    const url = URL.createObjectURL(blob);
    prefetchRef.current.set(i, url);
    return url;
  }

  async function playLiveFrom(i: number) {
    if (abortRef.current) return;
    const a = audioRef.current;
    if (!a) return;
    const total = chunksRef.current.length;
    if (i >= total) {
      stopAudio();
      return;
    }
    idxRef.current = i;
    try {
      const url = await fetchChunk(i);
      if (!url || abortRef.current) return;
      a.src = url;
      await a.play();
      setAudioState("playing");
      highlightAt(i / total);
      fetchChunk(i + 1).catch(() => {});
    } catch {
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
    if (!a || !a.duration || !total) return;
    highlightAt((idxRef.current + a.currentTime / a.duration) / total);
  }

  // Saqlangan ovoz vaqti bo'yicha yoritish
  function onSavedTime() {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    highlightAt(a.currentTime / a.duration);
  }

  async function toggleListen() {
    if (!ttsOn) return;
    setTtsError("");

    if (audioState === "playing") {
      if (browserRef.current && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.pause();
        } catch {}
        stopHlTimer(); // yoritish chizig'i to'xtaydi (pauza)
      } else audioRef.current?.pause();
      setAudioState("paused");
      return;
    }
    if (audioState === "paused") {
      if (browserRef.current && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
        } catch {}
      } else audioRef.current?.play();
      setAudioState("playing");
      return;
    }

    // Boshlash
    buildBlocks();
    abortRef.current = false;

    // 1) Saqlangan ovoz (bir marta yaratilган mp3) — eng silliq
    if (savedAudio && audioRef.current) {
      const a = audioRef.current;
      setAudioState("loading");
      a.src = savedAudio;
      try {
        await a.play();
        setAudioState("playing");
      } catch {
        setTtsError("Ovoz yuklanmadi.");
        setAudioState("idle");
      }
      return;
    }

    // 2) Jonli rejim (bo'lak-bo'lak)
    const text = contentRef.current?.innerText?.trim();
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
              {audioState === "playing" ? labels.pause : labels.listen}
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

      {ttsError && <p className="mb-4 text-xs text-red-500">{ttsError}</p>}
      {usingBrowser && (audioState === "playing" || audioState === "paused") && (
        <p className="mb-4 text-xs text-muted">🔊 Brauzer ovozi bilan o'qilmoqda (tabiiy ovoz uchun admin AI kalit qo'ysin).</p>
      )}

      {/* Yashirin audio element (saqlangan yoki jonli) */}
      <audio
        ref={audioRef}
        onEnded={() => (savedAudio ? stopAudio() : onLiveEnded())}
        onTimeUpdate={() => (savedAudio ? onSavedTime() : onLiveTime())}
        onError={() => !savedAudio && setAudioState((s) => (s === "loading" ? s : "idle"))}
        className="hidden"
      />

      <div ref={contentRef} style={{ ["--reading-scale" as string]: String(SCALES[scaleIdx]) }}>
        <PostContent html={current} />
      </div>
    </div>
  );
}
