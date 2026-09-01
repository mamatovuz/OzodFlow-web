"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Wand2,
  Upload,
  Loader2,
  Eye,
} from "lucide-react";
import { Button, Card, Label, Input, Switch } from "@/components/ui";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { LinkIcon } from "@/components/taplink/link-icon";
import { TaplinkView } from "@/components/taplink/taplink-view";
import { BusinessCard } from "@/components/taplink/business-card";
import { suggestColorsFromImage } from "@/lib/color-extract";
import { BASE_DOMAIN } from "@/lib/urls";
import {
  DEFAULT_DESIGN,
  TAPLINK_PRESETS,
  LINK_TYPES,
  LINK_TYPE_ORDER,
  parseDesign,
  parseLinks,
  parseCard,
  type TaplinkDesign,
  type TaplinkLink,
  type TaplinkCard,
  type LinkType,
  type ButtonShape,
  type ButtonFill,
  type BgType,
  type FontKey,
  type CardContactKey,
} from "@/lib/taplink";

type Initial = {
  handle: string;
  enabled: boolean;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  logo: string | null;
  videoUrl: string | null;
  links: string;
  showMenuButton: boolean;
  design: string;
  cardConfig: string;
};

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "links", label: "Tugmalar" },
  { key: "design", label: "Dizayn" },
  { key: "card", label: "Vizitka" },
  { key: "share", label: "QR / Havola" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function uid() {
  return `l${Math.random().toString(36).slice(2, 9)}`;
}

export function TaplinkEditor({
  initial,
  restaurantName,
  restaurantLogo,
  menuUrl,
}: {
  initial: Initial;
  restaurantName: string;
  restaurantLogo: string | null;
  menuUrl: string;
}) {
  const [tab, setTab] = useState<TabKey>("profile");

  const [enabled, setEnabled] = useState(initial.enabled);
  const [displayName, setDisplayName] = useState(initial.displayName || restaurantName);
  const [firstName, setFirstName] = useState(initial.firstName || "");
  const [lastName, setLastName] = useState(initial.lastName || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [logo, setLogo] = useState(initial.logo || restaurantLogo || "");
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl || "");
  const [showMenuButton, setShowMenuButton] = useState(initial.showMenuButton);
  const [links, setLinks] = useState<TaplinkLink[]>(() => parseLinks(initial.links));
  const [design, setDesign] = useState<TaplinkDesign>(() => parseDesign(initial.design));
  const [card, setCard] = useState<TaplinkCard>(() => parseCard(initial.cardConfig));

  const [handle, setHandle] = useState(initial.handle);
  const [savedState, setSavedState] = useState<"idle" | "saving" | "saved">("idle");

  const taplinkUrl = `https://${BASE_DOMAIN}/${handle}`;

  // ─── Avtomatik saqlash (debounce) ───
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSavedState("saving");
    const t = setTimeout(async () => {
      try {
        await fetch("/api/taplink", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            displayName,
            firstName,
            lastName,
            bio,
            logo,
            videoUrl,
            showMenuButton,
            links,
            design,
            cardConfig: card,
          }),
        });
        setSavedState("saved");
        setTimeout(() => setSavedState("idle"), 1500);
      } catch {
        setSavedState("idle");
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, displayName, firstName, lastName, bio, logo, videoUrl, showMenuButton, JSON.stringify(links), JSON.stringify(design), JSON.stringify(card)]);

  // Preview uchun ma'lumot
  const previewData = {
    displayName,
    firstName,
    lastName,
    bio,
    logo,
    videoUrl,
    links: JSON.stringify(links),
    design: JSON.stringify(design),
    showMenuButton,
  };

  // Vizitka uchun mavjud kontaktlar (links'dan)
  const availableContacts = useMemo(() => {
    const keys: CardContactKey[] = ["phone", "telegram", "instagram", "whatsapp", "website", "location", "email"];
    const out: { type: CardContactKey; value: string; label: string }[] = [];
    for (const l of links) {
      if (keys.includes(l.type as CardContactKey) && l.value) {
        out.push({ type: l.type as CardContactKey, value: l.value, label: LINK_TYPES[l.type].label });
      }
    }
    return out;
  }, [links]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Chap: sozlamalar */}
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition " +
                  (tab === t.key ? "bg-card text-foreground shadow-soft" : "text-muted hover:text-foreground")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <SaveBadge state={savedState} />
        </div>

        {tab === "profile" && (
          <ProfileTab
            {...{ enabled, setEnabled, displayName, setDisplayName, firstName, setFirstName, lastName, setLastName, bio, setBio, logo, setLogo, videoUrl, setVideoUrl, showMenuButton, setShowMenuButton, restaurantName }}
          />
        )}
        {tab === "links" && <LinksTab links={links} setLinks={setLinks} />}
        {tab === "design" && <DesignTab design={design} setDesign={setDesign} logo={logo} setLogo={setLogo} />}
        {tab === "card" && (
          <BusinessCard
            card={card}
            onChange={setCard}
            displayName={displayName}
            logo={logo || null}
            handle={handle}
            qrUrl={taplinkUrl}
            availableContacts={availableContacts}
          />
        )}
        {tab === "share" && (
          <ShareTab
            handle={handle}
            setHandle={setHandle}
            initialHandle={initial.handle}
            taplinkUrl={taplinkUrl}
          />
        )}
      </div>

      {/* O'ng: jonli preview (telefon) */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mx-auto w-full max-w-[320px]">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
            <Eye className="h-3.5 w-3.5" /> Jonli ko'rinish
          </div>
          <div className="overflow-hidden rounded-[2.2rem] border-[8px] border-neutral-800 bg-black shadow-2xl">
            <div className="h-[600px] overflow-y-auto">
              <TaplinkView data={previewData} menuUrl={menuUrl} preview />
            </div>
          </div>
          <a
            href={taplinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> {BASE_DOMAIN}/{handle}
          </a>
        </div>
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda...
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <Check className="h-3.5 w-3.5" /> Saqlandi
      </span>
    );
  return <span className="text-xs text-muted">Avtomatik saqlanadi</span>;
}

// ─────────── Profil tab ───────────
function ProfileTab(p: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  logo: string;
  setLogo: (v: string) => void;
  videoUrl: string;
  setVideoUrl: (v: string) => void;
  showMenuButton: boolean;
  setShowMenuButton: (v: boolean) => void;
  restaurantName: string;
}) {
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  async function uploadVideo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json?.success && json.data?.url) p.setVideoUrl(json.data.url);
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium text-foreground">Taplink yoqilgan</p>
          <p className="text-sm text-muted">O'chirilsa havola ochilmaydi</p>
        </div>
        <Switch checked={p.enabled} onChange={p.setEnabled} />
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-semibold text-foreground">Logo</h3>
        <ImageUpload value={p.logo} onChange={p.setLogo} label="Logo (kvadrat)" />
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <Label>Ko'rinadigan nom</Label>
          <Input value={p.displayName} onChange={(e) => p.setDisplayName(e.target.value)} placeholder={p.restaurantName} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ism</Label>
            <Input value={p.firstName} onChange={(e) => p.setFirstName(e.target.value)} placeholder="Ism" />
          </div>
          <div>
            <Label>Familiya</Label>
            <Input value={p.lastName} onChange={(e) => p.setLastName(e.target.value)} placeholder="Familiya" />
          </div>
        </div>
        <div>
          <Label>Qisqa tavsif</Label>
          <Input value={p.bio} onChange={(e) => p.setBio(e.target.value)} placeholder="Masalan: Milliy taomlar va yetkazib berish" maxLength={200} />
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-semibold text-foreground">Video</h3>
        <div>
          <Label>YouTube yoki video havolasi</Label>
          <Input value={p.videoUrl} onChange={(e) => p.setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div className="flex items-center gap-2">
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Video yuklash
          </Button>
          {p.videoUrl && (
            <button onClick={() => p.setVideoUrl("")} className="text-sm text-error hover:underline">
              O'chirish
            </button>
          )}
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium text-foreground">Menyu tugmasi</p>
          <p className="text-sm text-muted">Taplinkda "Menyuni ochish" tugmasi</p>
        </div>
        <Switch checked={p.showMenuButton} onChange={p.setShowMenuButton} />
      </Card>
    </div>
  );
}

// ─────────── Tugmalar tab ───────────
function LinksTab({ links, setLinks }: { links: TaplinkLink[]; setLinks: (v: TaplinkLink[]) => void }) {
  function add(type: LinkType) {
    setLinks([...links, { id: uid(), type, label: "", value: "" }]);
  }
  function update(id: string, patch: Partial<TaplinkLink>) {
    setLinks(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function remove(id: string) {
    setLinks(links.filter((l) => l.id !== id));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const copy = [...links];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setLinks(copy);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Tugma qo'shish</p>
        <div className="flex flex-wrap gap-2">
          {LINK_TYPE_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => add(type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
            >
              <LinkIcon type={type} className="h-4 w-4" style={{ color: LINK_TYPES[type].color }} />
              {LINK_TYPES[type].label}
            </button>
          ))}
        </div>
      </Card>

      {links.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          <Plus className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Hali tugma yo'q. Yuqoridan tanlab qo'shing.
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link, i) => {
            const meta = LINK_TYPES[link.type];
            return (
              <Card key={link.id} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${meta.color}18`, color: meta.color }}>
                      <LinkIcon type={link.type} className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === links.length - 1} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(link.id)} className="rounded p-1.5 text-error hover:bg-error/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{meta.hint}</Label>
                    <Input value={link.value} onChange={(e) => update(link.id, { value: e.target.value })} placeholder={meta.placeholder} />
                  </div>
                  <div>
                    <Label>Tugma matni (ixtiyoriy)</Label>
                    <Input value={link.label} onChange={(e) => update(link.id, { label: e.target.value })} placeholder={meta.label} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────── Dizayn tab ───────────
function DesignTab({
  design,
  setDesign,
  logo,
  setLogo,
}: {
  design: TaplinkDesign;
  setDesign: (v: TaplinkDesign) => void;
  logo: string;
  setLogo: (v: string) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");

  function set<K extends keyof TaplinkDesign>(key: K, value: TaplinkDesign[K]) {
    setDesign({ ...design, [key]: value });
  }

  async function suggestFromLogo() {
    if (!logo) {
      setSuggestMsg("Avval logo yuklang");
      return;
    }
    setSuggesting(true);
    setSuggestMsg("");
    try {
      const s = await suggestColorsFromImage(logo);
      if (!s) {
        setSuggestMsg("Rang aniqlanmadi, boshqa logo sinang");
        return;
      }
      setDesign({
        ...design,
        bgType: "gradient",
        bgColor: s.bg,
        bgColor2: s.bg2,
        buttonColor: s.button,
        buttonTextColor: s.buttonText,
        textColor: s.text,
      });
      setSuggestMsg("Logoga mos ranglar qo'llandi ✓");
    } finally {
      setSuggesting(false);
      setTimeout(() => setSuggestMsg(""), 2500);
    }
  }

  return (
    <div className="space-y-4">
      {/* Presetlar */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-foreground">Tayyor dizaynlar</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TAPLINK_PRESETS.map((preset) => {
            const active = JSON.stringify(design) === JSON.stringify(preset.design);
            const bg = preset.design.bgType === "gradient" ? `linear-gradient(160deg, ${preset.design.bgColor}, ${preset.design.bgColor2})` : preset.design.bgColor;
            return (
              <button
                key={preset.key}
                onClick={() => setDesign({ ...preset.design })}
                className={"overflow-hidden rounded-xl border-2 text-left transition " + (active ? "border-accent" : "border-transparent hover:border-accent/40")}
              >
                <div className="flex h-20 flex-col items-center justify-center gap-1.5" style={{ background: bg }}>
                  <span className="h-4 w-4 rounded-full" style={{ background: preset.design.buttonColor }} />
                  <span className="h-2.5 w-12 rounded-full" style={{ background: preset.design.buttonColor, opacity: 0.9 }} />
                  <span className="h-2.5 w-10 rounded-full" style={{ background: preset.design.buttonColor, opacity: 0.7 }} />
                </div>
                <p className="bg-card px-2 py-1.5 text-center text-xs font-medium text-foreground">{preset.name}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Logodan rang */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Wand2 className="h-4 w-4 text-accent" /> Logodan rang taklifi
            </h3>
            <p className="text-sm text-muted">Logo ranglariga mos fon va tugma rangini avtomatik tanlaydi</p>
          </div>
          <Button onClick={suggestFromLogo} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Taklif qilish
          </Button>
        </div>
        {suggestMsg && <p className="mt-2 text-sm text-accent">{suggestMsg}</p>}
      </Card>

      {/* Fon */}
      <Card className="space-y-4 p-5">
        <h3 className="font-semibold text-foreground">Fon</h3>
        <div className="flex flex-wrap gap-2">
          {(["gradient", "solid", "image"] as BgType[]).map((t) => (
            <button
              key={t}
              onClick={() => set("bgType", t)}
              className={"rounded-lg border px-3 py-1.5 text-sm " + (design.bgType === t ? "border-accent bg-accent-soft text-accent" : "border-border")}
            >
              {t === "gradient" ? "Gradient" : t === "solid" ? "Bir rang" : "Rasm"}
            </button>
          ))}
        </div>
        {design.bgType === "image" ? (
          <ImageUpload value={design.bgImage} onChange={(url) => set("bgImage", url)} aspect="wide" label="Fon rasmi" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Rang 1" value={design.bgColor} onChange={(v) => set("bgColor", v)} />
            {design.bgType === "gradient" && <ColorField label="Rang 2" value={design.bgColor2} onChange={(v) => set("bgColor2", v)} />}
          </div>
        )}
        {design.bgType === "image" && (
          <div>
            <Label>Qoraytirish: {design.bgOverlay}%</Label>
            <input type="range" min={0} max={80} value={design.bgOverlay} onChange={(e) => set("bgOverlay", Number(e.target.value))} className="w-full accent-[var(--accent,#2563EB)]" />
          </div>
        )}
      </Card>

      {/* Tugmalar */}
      <Card className="space-y-4 p-5">
        <h3 className="font-semibold text-foreground">Tugmalar</h3>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Tugma rangi" value={design.buttonColor} onChange={(v) => set("buttonColor", v)} />
          <ColorField label="Tugma matni" value={design.buttonTextColor} onChange={(v) => set("buttonTextColor", v)} />
        </div>
        <div>
          <Label>Shakl</Label>
          <div className="flex flex-wrap gap-2">
            {(["rounded", "pill", "sharp"] as ButtonShape[]).map((s) => (
              <button key={s} onClick={() => set("buttonShape", s)} className={"rounded-lg border px-3 py-1.5 text-sm " + (design.buttonShape === s ? "border-accent bg-accent-soft text-accent" : "border-border")}>
                {s === "rounded" ? "Yumaloq" : s === "pill" ? "Tabletka" : "O'tkir"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>To'ldirish</Label>
          <div className="flex flex-wrap gap-2">
            {(["solid", "soft", "outline", "glass"] as ButtonFill[]).map((s) => (
              <button key={s} onClick={() => set("buttonFill", s)} className={"rounded-lg border px-3 py-1.5 text-sm " + (design.buttonFill === s ? "border-accent bg-accent-soft text-accent" : "border-border")}>
                {s === "solid" ? "To'liq" : s === "soft" ? "Yumshoq" : s === "outline" ? "Chiziqli" : "Shaffof"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={design.brandIcons} onChange={(v) => set("brandIcons", v)} label="Ikonkalar brend rangida" />
        </label>
      </Card>

      {/* Matn / shrift */}
      <Card className="space-y-4 p-5">
        <h3 className="font-semibold text-foreground">Matn</h3>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Matn rangi" value={design.textColor} onChange={(v) => set("textColor", v)} />
          <div>
            <Label>Shrift</Label>
            <div className="flex flex-wrap gap-2">
              {(["sans", "serif", "rounded", "mono"] as FontKey[]).map((f) => (
                <button key={f} onClick={() => set("font", f)} className={"rounded-lg border px-2.5 py-1.5 text-xs " + (design.font === f ? "border-accent bg-accent-soft text-accent" : "border-border")}>
                  {f === "sans" ? "Oddiy" : f === "serif" ? "Serif" : f === "rounded" ? "Yumaloq" : "Mono"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label>Logo shakli</Label>
          <div className="flex flex-wrap gap-2">
            {(["circle", "rounded", "square"] as const).map((s) => (
              <button key={s} onClick={() => set("avatarShape", s)} className={"rounded-lg border px-3 py-1.5 text-sm " + (design.avatarShape === s ? "border-accent bg-accent-soft text-accent" : "border-border")}>
                {s === "circle" ? "Doira" : s === "rounded" ? "Yumaloq" : "Kvadrat"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setDesign({ ...DEFAULT_DESIGN })} className="text-sm text-muted hover:text-foreground hover:underline">
          Standart holatga qaytarish
        </button>
      </Card>
    </div>
  );
}

// ─────────── QR / Havola tab ───────────
function ShareTab({
  handle,
  setHandle,
  initialHandle,
  taplinkUrl,
}: {
  handle: string;
  setHandle: (v: string) => void;
  initialHandle: string;
  taplinkUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(handle);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, taplinkUrl, { width: 320, margin: 2, errorCorrectionLevel: "H" });
    }
  }, [taplinkUrl]);

  async function saveHandle() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/taplink/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: draft }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg({ type: "err", text: json.error || "Xatolik" });
        return;
      }
      setHandle(json.data.handle);
      setDraft(json.data.handle);
      setMsg({ type: "ok", text: "Manzil o'zgartirildi" });
    } catch {
      setMsg({ type: "err", text: "Tarmoq xatosi" });
    } finally {
      setSaving(false);
    }
  }

  function downloadQr() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `taplink-qr-${handle}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(taplinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
      <Card className="flex flex-col items-center p-6">
        <div className="w-full max-w-[220px] rounded-2xl bg-white p-4 shadow-soft">
          <canvas ref={canvasRef} className="!h-auto !w-full" />
        </div>
        <p className="mt-3 text-sm text-muted">Skanerlang — taplink ochiladi</p>
        <Button onClick={downloadQr} className="mt-3">
          <Download className="h-4 w-4" /> QR yuklab olish
        </Button>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Havola</h3>
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="flex-1 truncate text-sm text-foreground">{taplinkUrl}</span>
            <button onClick={copyLink} className="text-muted hover:text-accent">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <a href={taplinkUrl} target="_blank" rel="noreferrer" className="mt-3 block">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4" /> Ochish
            </Button>
          </a>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 font-semibold text-foreground">Manzilni o'zgartirish</h3>
          <p className="mb-3 text-sm text-muted">Qisqa va eslab qolinadigan nom tanlang</p>
          <div className="flex items-center overflow-hidden rounded-lg border border-border">
            <span className="whitespace-nowrap bg-surface-2 px-2.5 py-2 text-sm text-muted">{BASE_DOMAIN}/</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 bg-card px-2 py-2 text-sm outline-none"
              placeholder="safirun"
            />
          </div>
          {msg && <p className={"mt-2 text-sm " + (msg.type === "err" ? "text-error" : "text-success")}>{msg.text}</p>}
          <Button onClick={saveHandle} disabled={saving || draft === handle} className="mt-3 w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Saqlash
          </Button>
          {draft !== initialHandle && (
            <p className="mt-2 text-xs text-muted">Diqqat: eski QR ishlamay qolishi mumkin.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
