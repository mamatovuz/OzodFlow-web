"use client";

import { useMemo, useRef, useState } from "react";
import {
  X,
  Loader2,
  Check,
  Home,
  Palette,
  ImageIcon,
  LayoutGrid,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Video,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui";
import { getTheme, menuStyleFor } from "@/lib/themes";
import {
  resolveDesign,
  defaultDesignFromTheme,
  backgroundCss,
  shadowCss,
  PALETTES,
  type DesignConfig,
  type DesignColors,
  type BackgroundType,
  type CardShadow,
  type HeroMedia,
} from "@/lib/design";

type RestaurantLite = {
  name: string;
  description: string | null;
  logo: string | null;
};

const COLOR_FIELDS: { key: keyof DesignColors; label: string }[] = [
  { key: "accent", label: "Asosiy / tugma rangi" },
  { key: "accentText", label: "Tugma matni" },
  { key: "background", label: "Fon rangi" },
  { key: "surface", label: "Ikkinchi fon" },
  { key: "card", label: "Karta rangi" },
  { key: "foreground", label: "Asosiy matn" },
  { key: "muted", label: "Ikkilamchi matn" },
  { key: "border", label: "Chegara (border)" },
];

type SectionKey = "home" | "colors" | "background" | "cards";
const SECTIONS: { key: SectionKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Bosh sahifa", icon: Home },
  { key: "colors", label: "Ranglar", icon: Palette },
  { key: "background", label: "Fon", icon: ImageIcon },
  { key: "cards", label: "Kartalar", icon: LayoutGrid },
];

export function DesignEditor({
  themeKey,
  initialConfig,
  restaurant,
  onClose,
  onSaved,
}: {
  themeKey: string;
  initialConfig: DesignConfig;
  restaurant: RestaurantLite;
  onClose: () => void;
  onSaved: (config: DesignConfig) => void;
}) {
  const theme = useMemo(() => getTheme(themeKey), [themeKey]);
  const [config, setConfig] = useState<DesignConfig>(initialConfig);
  const [section, setSection] = useState<SectionKey>("home");
  const [previewMode, setPreviewMode] = useState<"intro" | "menu">("intro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const design = useMemo(() => resolveDesign(theme, config), [theme, config]);
  const def = useMemo(() => defaultDesignFromTheme(theme), [theme]);

  // ─── config yangilash yordamchilari ───
  function setColor(key: keyof DesignColors, value: string) {
    setConfig((c) => ({ ...c, colors: { ...c.colors, [key]: value } }));
  }
  function applyPalette(colors: DesignColors) {
    setConfig((c) => ({ ...c, colors: { ...colors } }));
  }
  function setBg<K extends keyof NonNullable<DesignConfig["background"]>>(
    key: K,
    value: NonNullable<DesignConfig["background"]>[K]
  ) {
    setConfig((c) => ({ ...c, background: { ...c.background, [key]: value } }));
  }
  function setCard<K extends keyof NonNullable<DesignConfig["card"]>>(
    key: K,
    value: NonNullable<DesignConfig["card"]>[K]
  ) {
    setConfig((c) => ({ ...c, card: { ...c.card, [key]: value } }));
  }
  function setHero<K extends keyof NonNullable<DesignConfig["hero"]>>(
    key: K,
    value: NonNullable<DesignConfig["hero"]>[K]
  ) {
    setConfig((c) => ({ ...c, hero: { ...c.hero, [key]: value } }));
  }
  function setRadius(v: number) {
    setConfig((c) => ({ ...c, radius: v }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuTheme: themeKey,
        designConfig: JSON.stringify(config),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Saqlashda xatolik");
      return;
    }
    onSaved(config);
  }

  function resetAll() {
    setConfig({});
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Dizaynni sozlash — {theme.name}
            </h2>
            <p className="hidden text-xs text-muted sm:block">
              O'zgarishlar o'ngdagi telefonda darhol ko'rinadi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground sm:flex"
            title="Asl holatga qaytarish"
          >
            <RotateCcw className="h-4 w-4" /> Tozalash
          </button>
          <Button variant="outline" onClick={onClose} className="hidden sm:inline-flex">
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Saqlash
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 px-4 py-2 text-sm text-error">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ─── CHAP: sozlamalar ─── */}
        <div className="flex min-h-0 flex-1 flex-col border-b border-border lg:max-w-md lg:border-b-0 lg:border-r">
          {/* Bo'lim tablari */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card p-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {section === "home" && (
              <HomeSection
                config={config}
                heroEnabled={design.hero.enabled}
                ctaText={design.hero.ctaText}
                media={design.hero.media}
                autoplay={design.hero.autoplay}
                restaurant={restaurant}
                setHero={setHero}
              />
            )}
            {section === "colors" && (
              <ColorsSection
                colors={design.colors}
                onSet={setColor}
                onPalette={applyPalette}
              />
            )}
            {section === "background" && (
              <BackgroundSection design={design} setBg={setBg} />
            )}
            {section === "cards" && (
              <CardsSection
                radius={design.radius}
                cardRadius={design.card.radius}
                shadow={design.card.shadow}
                defRadius={def.radius}
                onRadius={setRadius}
                onCardRadius={(v) => setCard("radius", v)}
                onShadow={(v) => setCard("shadow", v)}
              />
            )}
          </div>
        </div>

        {/* ─── O'NG: telefon live preview ─── */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto bg-surface-2 p-4 sm:p-6">
          <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setPreviewMode("intro")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                previewMode === "intro" ? "bg-accent text-white" : "text-muted"
              }`}
            >
              Bosh sahifa
            </button>
            <button
              onClick={() => setPreviewMode("menu")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                previewMode === "menu" ? "bg-accent text-white" : "text-muted"
              }`}
            >
              Menyu
            </button>
          </div>
          <PhonePreview
            design={design}
            theme={theme}
            restaurant={restaurant}
            mode={previewMode}
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════ BOSH SAHIFA ══════════════
function HomeSection({
  heroEnabled,
  ctaText,
  media,
  autoplay,
  restaurant,
  setHero,
}: {
  config: DesignConfig;
  heroEnabled: boolean;
  ctaText: string;
  media: HeroMedia[];
  autoplay: boolean;
  restaurant: RestaurantLite;
  setHero: <K extends keyof NonNullable<DesignConfig["hero"]>>(
    key: K,
    value: NonNullable<DesignConfig["hero"]>[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-3">
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-foreground">
              Bosh sahifani yoqish
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              QR kod ochilganda mijoz birinchi bu ekranni ko'radi: rasm/video,
              logo va "Menyuni ko'rish" tugmasi.
            </span>
          </span>
          <input
            type="checkbox"
            checked={heroEnabled}
            onChange={(e) => setHero("enabled", e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent,#2563eb)]"
          />
        </label>
      </div>

      {heroEnabled && (
        <>
          <div>
            <SectionLabel>Rasm / Video slider</SectionLabel>
            <p className="mb-2 text-xs text-muted">
              Bir nechta rasm yoki video qo'shing. Birinchisi — asosiy. Slayd
              avtomatik almashadi, video ovozsiz o'ynaydi.
            </p>
            <MediaManager media={media} onChange={(m) => setHero("media", m)} />
          </div>

          {media.some((m) => m.kind === "image") && media.length > 1 && (
            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="text-sm text-foreground">Avtomatik slayd</span>
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setHero("autoplay", e.target.checked)}
                className="h-5 w-5 accent-[var(--accent,#2563eb)]"
              />
            </label>
          )}

          <div>
            <SectionLabel>Tugma matni</SectionLabel>
            <input
              value={ctaText}
              onChange={(e) => setHero("ctaText", e.target.value)}
              placeholder="Menyuni ko'rish"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-muted">
              Bu tugma bosilganda menyu sahifasi ochiladi. Tugma rangi
              "Ranglar" bo'limidagi asosiy rangdan olinadi.
            </p>
          </div>
        </>
      )}

      {/* Logo + profil (qulaylik uchun shu yerda) */}
      <div className="border-t border-border pt-4">
        <SectionLabel>Logo</SectionLabel>
        <p className="mb-2 text-xs text-muted">
          Bosh sahifa va menyu tepasida ko'rinadi.
        </p>
        <LogoUploader logo={restaurant.logo} />
        <p className="mt-3 text-xs text-muted">
          Restoran nomi va tavsifi <b>Restoran profili</b> bo'limida
          o'zgartiriladi.
        </p>
      </div>
    </div>
  );
}

// Logoni to'g'ridan-to'g'ri restaurant.logo ga saqlaydi
function LogoUploader({ logo }: { logo: string | null }) {
  const [url, setUrl] = useState(logo || "");
  const [busy, setBusy] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    const uj = await up.json();
    if (up.ok) {
      setUrl(uj.data.url);
      await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: uj.data.url }),
      });
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="logo"
          className="h-16 w-16 rounded-xl border border-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-muted">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-accent">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Logo yuklash
        <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy} />
      </label>
    </div>
  );
}

// Hero media boshqaruvi (qo'shish / tartiblash / o'chirish / asosiy)
function MediaManager({
  media,
  onChange,
}: {
  media: HeroMedia[];
  onChange: (m: HeroMedia[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setErr("");
    const added: HeroMedia[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "Yuklashda xatolik");
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        kind: json.data.kind === "video" ? "video" : "image",
        url: json.data.url,
      });
    }
    onChange([...media, ...added].slice(0, 8));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function remove(i: number) {
    onChange(media.filter((_, k) => k !== i));
  }
  function makePrimary(i: number) {
    if (i === 0) return;
    const next = [...media];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {media.map((m, i) => (
        <div
          key={m.id}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {m.kind === "video" ? (
              <video src={m.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            {m.kind === "video" && (
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                <Video className="inline h-2.5 w-2.5" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {i === 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-accent">
                <Star className="h-3 w-3 fill-current" /> Asosiy
              </span>
            ) : (
              <button
                onClick={() => makePrimary(i)}
                className="text-xs text-muted hover:text-accent"
              >
                Asosiy qilish
              </button>
            )}
            <span className="block truncate text-[11px] text-muted">
              {m.kind === "video" ? "Video" : "Rasm"}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === media.length - 1}
              className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(i)}
              className="rounded p-1.5 text-error hover:bg-error/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {err && <p className="text-xs text-error">{err}</p>}

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-5 text-muted hover:border-accent hover:text-accent">
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Upload className="h-5 w-5" />
            <span className="mt-1 text-sm">Rasm yoki video qo'shish</span>
            <span className="text-[11px] text-muted">JPG, PNG, MP4, WEBM</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={add}
          disabled={busy}
        />
      </label>
    </div>
  );
}

// ══════════════ RANGLAR ══════════════
function ColorsSection({
  colors,
  onSet,
  onPalette,
}: {
  colors: DesignColors;
  onSet: (key: keyof DesignColors, value: string) => void;
  onPalette: (colors: DesignColors) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Tayyor paletralar</SectionLabel>
        <p className="mb-2 text-xs text-muted">
          Bittasini tanlang — barcha ranglar avtomatik o'zgaradi. Keyin
          xohlasangiz qo'lda tuzatasiz.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PALETTES.map((p) => (
            <button
              key={p.key}
              onClick={() => onPalette(p.colors)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left hover:border-accent"
            >
              <span className="flex shrink-0 -space-x-1.5">
                <span
                  className="h-6 w-6 rounded-full border-2 border-card"
                  style={{ background: p.swatch[0] }}
                />
                <span
                  className="h-6 w-6 rounded-full border-2 border-card"
                  style={{ background: p.swatch[1] }}
                />
              </span>
              <span className="text-sm font-medium text-foreground">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Ranglarni qo'lda sozlash</SectionLabel>
        <div className="mt-1 space-y-1.5">
          {COLOR_FIELDS.map((f) => (
            <ColorRow
              key={f.key}
              label={f.label}
              value={colors[f.key]}
              onChange={(v) => onSet(f.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-border bg-surface-2 px-2 py-1 text-right font-mono text-xs text-foreground outline-none focus:border-accent"
        />
        <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            value={safeHex(value)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

// ══════════════ FON ══════════════
function BackgroundSection({
  design,
  setBg,
}: {
  design: ReturnType<typeof resolveDesign>;
  setBg: <K extends keyof NonNullable<DesignConfig["background"]>>(
    key: K,
    value: NonNullable<DesignConfig["background"]>[K]
  ) => void;
}) {
  const bg = design.background;
  const types: { key: BackgroundType; label: string }[] = [
    { key: "theme", label: "Standart" },
    { key: "color", label: "Rang" },
    { key: "image", label: "Rasm" },
    { key: "gradient", label: "Gradient" },
  ];
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Menyu foni</SectionLabel>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {types.map((t) => (
            <button
              key={t.key}
              onClick={() => setBg("type", t.key)}
              className={`rounded-lg border py-2 text-xs font-medium ${
                bg.type === t.key
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {bg.type === "color" && (
        <ColorRow label="Fon rangi" value={bg.color} onChange={(v) => setBg("color", v)} />
      )}

      {bg.type === "gradient" && (
        <div className="space-y-1.5">
          <ColorRow
            label="Boshi"
            value={bg.gradientFrom}
            onChange={(v) => setBg("gradientFrom", v)}
          />
          <ColorRow
            label="Oxiri"
            value={bg.gradientTo}
            onChange={(v) => setBg("gradientTo", v)}
          />
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between text-sm text-foreground">
              <span>Burchak</span>
              <span className="text-xs text-muted">{bg.gradientAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={bg.gradientAngle}
              onChange={(e) => setBg("gradientAngle", Number(e.target.value))}
              className="mt-1 w-full accent-[var(--accent,#2563eb)]"
            />
          </div>
        </div>
      )}

      {bg.type === "image" && (
        <BgImageUploader url={bg.image} onChange={(u) => setBg("image", u)} />
      )}

      {(bg.type === "image" || bg.type === "gradient") && (
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between text-sm text-foreground">
            <span>Qoraytirish (overlay)</span>
            <span className="text-xs text-muted">{bg.overlay}%</span>
          </div>
          <p className="mb-1 text-xs text-muted">
            Fon yorqin bo'lsa, matn o'qilishi uchun ustiga soya beriladi.
          </p>
          <input
            type="range"
            min={0}
            max={80}
            value={bg.overlay}
            onChange={(e) => setBg("overlay", Number(e.target.value))}
            className="w-full accent-[var(--accent,#2563eb)]"
          />
        </div>
      )}
    </div>
  );
}

function BgImageUploader({
  url,
  onChange,
}: {
  url: string;
  onChange: (u: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) onChange(json.data.url);
    setBusy(false);
  }
  return (
    <div>
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-error text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-muted hover:border-accent hover:text-accent">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="mt-1 text-sm">Fon rasmi yuklash</span>
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy} />
        </label>
      )}
    </div>
  );
}

// ══════════════ KARTALAR ══════════════
function CardsSection({
  cardRadius,
  shadow,
  defRadius,
  onRadius,
  onCardRadius,
  onShadow,
}: {
  radius: number;
  cardRadius: number;
  shadow: CardShadow;
  defRadius: number;
  onRadius: (v: number) => void;
  onCardRadius: (v: number) => void;
  onShadow: (v: CardShadow) => void;
}) {
  const shadows: { key: CardShadow; label: string }[] = [
    { key: "none", label: "Yo'q" },
    { key: "soft", label: "Yengil" },
    { key: "medium", label: "O'rta" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="flex items-center justify-between text-sm text-foreground">
          <span>Umumiy burchak radiusi</span>
          <span className="text-xs text-muted">{cardRadius}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={32}
          value={cardRadius}
          onChange={(e) => {
            const v = Number(e.target.value);
            onRadius(v);
            onCardRadius(v);
          }}
          className="mt-2 w-full accent-[var(--accent,#2563eb)]"
        />
        <button
          onClick={() => {
            onRadius(defRadius);
            onCardRadius(defRadius);
          }}
          className="mt-1 text-xs text-muted hover:text-accent"
        >
          Standart ({defRadius}px)
        </button>
      </div>

      <div>
        <SectionLabel>Karta soyasi (shadow)</SectionLabel>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {shadows.map((s) => (
            <button
              key={s.key}
              onClick={() => onShadow(s.key)}
              className={`rounded-lg border py-2 text-sm font-medium ${
                shadow === s.key
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════ TELEFON LIVE PREVIEW ══════════════
function PhonePreview({
  design,
  theme,
  restaurant,
  mode,
}: {
  design: ReturnType<typeof resolveDesign>;
  theme: ReturnType<typeof getTheme>;
  restaurant: RestaurantLite;
  mode: "intro" | "menu";
}) {
  const c = design.colors;
  const R = design.radius;
  const pageBg = backgroundCss(design.background, c.background);
  const overlay =
    (design.background.type === "image" || design.background.type === "gradient") &&
    design.background.overlay > 0
      ? design.background.overlay / 100
      : 0;
  const cardShadow = shadowCss(design.card.shadow, theme.isDark);

  return (
    <div
      className="relative w-full max-w-[300px] shrink-0 overflow-hidden rounded-[2.2rem] border-[7px] border-gray-900 shadow-2xl"
      style={{ aspectRatio: "9/19" }}
    >
      {/* notch */}
      <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
      <div
        className="relative h-full w-full overflow-y-auto"
        style={{
          backgroundColor: pageBg.backgroundColor,
          backgroundImage: pageBg.backgroundImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: c.foreground,
        }}
      >
        {overlay > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ background: `rgba(0,0,0,${overlay})` }}
          />
        )}
        <div className="relative z-10">
          {mode === "intro" ? (
            <IntroPreview design={design} restaurant={restaurant} />
          ) : (
            <MenuPreview
              design={design}
              theme={theme}
              restaurant={restaurant}
              cardShadow={cardShadow}
              R={R}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function IntroPreview({
  design,
  restaurant,
}: {
  design: ReturnType<typeof resolveDesign>;
  restaurant: RestaurantLite;
}) {
  const c = design.colors;
  const first = design.hero.media[0];
  const enabled = design.hero.enabled;

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero media — yarimdan kamroq (tepada) */}
      <div className="relative h-[45%] min-h-[210px] w-full overflow-hidden bg-black/10">
        {enabled && first ? (
          first.kind === "video" ? (
            <video
              src={first.url}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.surface2})` }}
          >
            <span className="px-4 text-center text-xs text-white/80">
              {enabled ? "Rasm yoki video qo'shing" : "Bosh sahifa o'chirilgan"}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profil + CTA */}
      <div className="flex flex-1 flex-col items-center px-5 pb-7 pt-5 text-center">
        {restaurant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logo}
            alt=""
            className="-mt-12 h-16 w-16 rounded-2xl border-2 object-cover shadow-lg"
            style={{ borderColor: c.card }}
          />
        ) : (
          <div
            className="-mt-12 flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-lg font-bold shadow-lg"
            style={{ borderColor: c.card, background: c.accent, color: c.accentText }}
          >
            {restaurant.name.slice(0, 1)}
          </div>
        )}
        <h3 className="mt-3 text-lg font-bold" style={{ color: c.foreground }}>
          {restaurant.name}
        </h3>
        {restaurant.description && (
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: c.muted }}>
            {restaurant.description}
          </p>
        )}
        <div className="mt-auto w-full pt-6">
          <div
            className="w-full py-3 text-center text-sm font-semibold"
            style={{
              background: c.accent,
              color: c.accentText,
              borderRadius: design.card.radius,
            }}
          >
            {design.hero.ctaText || "Menyuni ko'rish"}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuPreview({
  design,
  theme,
  restaurant,
  cardShadow,
  R,
}: {
  design: ReturnType<typeof resolveDesign>;
  theme: ReturnType<typeof getTheme>;
  restaurant: RestaurantLite;
  cardShadow: string;
  R: number;
}) {
  const c = design.colors;
  const split = menuStyleFor(theme.key) === "split";
  const cats = ["🥗 Salatlar", "🍔 Burger", "🍕 Pitsa", "🍜 Sho'rva", "🥤 Ichimlik"];
  const items = [
    { n: "Osh", p: "45 000" },
    { n: "Lag'mon", p: "38 000" },
    { n: "Somsa", p: "12 000" },
    { n: "Choy", p: "5 000" },
  ];

  const ProductCard = ({ it }: { it: { n: string; p: string } }) => (
    <div
      className="overflow-hidden"
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: design.card.radius,
        boxShadow: cardShadow,
      }}
    >
      <div style={{ background: c.surface2, aspectRatio: "4/3" }} />
      <div className="p-2">
        <div className="text-xs font-semibold" style={{ color: c.foreground }}>
          {it.n}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[11px] font-bold" style={{ color: c.accent }}>
            {it.p}
          </span>
          <span
            className="flex h-5 w-5 items-center justify-center text-xs font-bold"
            style={{ background: c.accent, color: c.accentText, borderRadius: Math.min(R, 999) }}
          >
            +
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-3 py-3">
      {/* header */}
      <div className="flex items-center gap-2">
        {restaurant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={restaurant.logo} alt="" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
            style={{ background: c.accent, color: c.accentText }}
          >
            {restaurant.name.slice(0, 1)}
          </div>
        )}
        <span className="text-sm font-semibold" style={{ color: c.foreground }}>
          {restaurant.name}
        </span>
      </div>

      {/* search */}
      <div
        className="mt-3 h-8 w-full rounded-full px-3 text-xs leading-8"
        style={{ background: c.surface, color: c.muted, border: `1px solid ${c.border}` }}
      >
        Qidirish...
      </div>

      {split ? (
        /* ─── SPLIT: chapda kategoriyalar, o'ngda mahsulotlar ─── */
        <div className="mt-3 grid grid-cols-[64px_1fr] gap-2">
          <div className="space-y-1.5">
            {cats.map((cat, i) => (
              <div
                key={cat}
                className="px-1.5 py-2 text-center text-[9px] font-semibold leading-tight"
                style={
                  i === 0
                    ? { background: c.accent, color: c.accentText, borderRadius: design.card.radius }
                    : {
                        background: c.card,
                        color: c.foreground,
                        border: `1px solid ${c.border}`,
                        borderRadius: design.card.radius,
                      }
                }
              >
                {cat}
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold" style={{ color: c.foreground }}>
              Salatlar
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((it) => (
                <ProductCard key={it.n} it={it} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* kategoriya chiplari */}
          <div className="mt-3 flex gap-1.5 overflow-hidden">
            {cats.slice(0, 4).map((cat, i) => (
              <span
                key={cat}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={
                  i === 0
                    ? { background: c.accent, color: c.accentText }
                    : { background: c.surface2, color: c.foreground }
                }
              >
                {cat}
              </span>
            ))}
          </div>
          {/* mahsulotlar grid */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {items.map((it) => (
              <ProductCard key={it.n} it={it} />
            ))}
          </div>
        </>
      )}

      {/* pastki savat bar */}
      <div
        className="mt-3 flex items-center justify-between px-3 py-2.5 text-xs font-semibold"
        style={{ background: c.accent, color: c.accentText, borderRadius: design.card.radius }}
      >
        <span>Savat · 2</span>
        <span>83 000 so'm</span>
      </div>
    </div>
  );
}

// ─── umumiy kichik komponentlar ───
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-sm font-semibold text-foreground">{children}</h3>;
}

function safeHex(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
}
