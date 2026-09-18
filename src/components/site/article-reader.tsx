"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { List, Minus, Plus, Volume2, Pause, Play, Languages, Loader2, ChevronDown } from "lucide-react";
import { PostContent } from "./post-content";

type Toc = { id: string; text: string; level: number };
type Tr = { title: string; html: string };
type Voice = { id: string; name: string; gender?: string; short?: string };

const SCALES = [0.9, 1, 1.12, 1.28];

// Matnni ≤900 baytli jumla bo'laklariga bo'ladi (VoiceLab 1000 bayt chegarasi)
function splitChunks(text: string, maxBytes = 900): string[] {
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
  labels,
}: {
  html: string;
  toc: Toc[];
  translations: Record<string, Tr>;
  slug: string;
  ttsOn: boolean;
  labels: { toc: string; listen: string; pause: string; original: string; translate: string };
}) {
  const [scaleIdx, setScaleIdx] = useState(1);
  const [lang, setLang] = useState<string>("orig");
  const [activeId, setActiveId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Ovozli o'qish (VoiceLab) ──
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string>("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const prefetchRef = useRef<Map<number, string>>(new Map());
  const abortRef = useRef(false);

  const trLangs = useMemo(() => Object.keys(translations || {}), [translations]);
  const current = lang === "orig" ? html : translations[lang]?.html || html;
  const showToc = lang === "orig" && toc.length >= 3;
  const ttsLang = lang === "ru" ? "ru" : lang === "en" ? "en" : "uz";

  // Shrift o'lchamini eslab qolamiz
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

  // Scrollspy
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

  // Ovozlar ro'yxatini yuklaymiz (til o'zgarsa qayta)
  useEffect(() => {
    if (!ttsOn) return;
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
  }, [ttsLang, ttsOn]);

  const stopAudio = useCallback(() => {
    abortRef.current = true;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
    }
    prefetchRef.current.forEach((url) => URL.revokeObjectURL(url));
    prefetchRef.current.clear();
    idxRef.current = 0;
    setAudioState("idle");
  }, []);

  // Til/tarjima almashsa yoki komponent yopilsa — to'xtatamiz
  useEffect(() => {
    stopAudio();
  }, [lang, stopAudio]);
  useEffect(() => () => stopAudio(), [stopAudio]);

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
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Ovoz xatosi");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    prefetchRef.current.set(i, url);
    return url;
  }

  async function playFrom(i: number) {
    if (abortRef.current) return;
    const a = audioRef.current;
    if (!a) return;
    if (i >= chunksRef.current.length) {
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
      // Keyingi bo'lakni oldindan yuklaymiz (silliq o'tish)
      fetchChunk(i + 1).catch(() => {});
    } catch (e) {
      setTtsError(e instanceof Error ? e.message : "Ovoz xatosi");
      stopAudio();
    }
  }

  async function toggleListen() {
    if (!ttsOn) return;
    setTtsError("");
    if (audioState === "playing") {
      audioRef.current?.pause();
      setAudioState("paused");
      return;
    }
    if (audioState === "paused") {
      audioRef.current?.play();
      setAudioState("playing");
      return;
    }
    // Boshlash
    const text = contentRef.current?.innerText?.trim();
    if (!text) return;
    chunksRef.current = splitChunks(text, 1200);
    if (chunksRef.current.length === 0) return;
    abortRef.current = false;
    prefetchRef.current.clear();
    setAudioState("loading");
    await playFrom(0);
  }

  function onEnded() {
    if (abortRef.current) return;
    // Joriy bo'lak URL'ini tozalaymiz
    const done = idxRef.current;
    const url = prefetchRef.current.get(done);
    if (url) {
      URL.revokeObjectURL(url);
      prefetchRef.current.delete(done);
    }
    playFrom(done + 1);
  }

  const selectedVoice = voices.find((v) => v.id === voiceId);

  return (
    <div>
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

            {/* Ovoz tanlash */}
            {voices.length > 1 && (
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

      {/* Yashirin audio element */}
      <audio ref={audioRef} onEnded={onEnded} onError={() => setAudioState("idle")} className="hidden" />

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
