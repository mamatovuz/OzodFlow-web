"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  Save,
  Eye,
  Type,
  Heading,
  Image as ImageIcon,
  MousePointerClick,
  Users,
  Check,
  Phone,
  Send,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button, Card, Input, Textarea, Label, Switch, Badge } from "@/components/ui";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { slugify } from "@/lib/utils";
import {
  type LandingBlock,
  type FieldKey,
  FIELD_META,
  newBlockId,
  parseBlocks,
} from "@/lib/landing-blocks";

type PageProps = {
  id: string;
  slug: string;
  title: string;
  blocks: string;
  isPublished: boolean;
  views: number;
};

type Submission = {
  id: string;
  name: string;
  lastName: string | null;
  phone: string | null;
  brand: string | null;
  telegram: string | null;
  extra: string | null;
  contacted: boolean;
  createdAt: string;
};

const FIELD_ORDER: Exclude<FieldKey, "custom">[] = [
  "name",
  "lastName",
  "phone",
  "brand",
  "telegram",
];

export function LandingBuilder({ page }: { page: PageProps }) {
  const [tab, setTab] = useState<"build" | "subs">("build");

  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isPublished, setIsPublished] = useState(page.isPublished);
  const [blocks, setBlocks] = useState<LandingBlock[]>(parseBlocks(page.blocks));
  const [preview, setPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ─── blok amallari ───
  function addBlock(b: LandingBlock) {
    setBlocks((prev) => {
      // "submit" har doim oxirida qolsin
      const submitIdx = prev.findIndex((x) => x.type === "submit");
      if (b.type !== "submit" && submitIdx !== -1) {
        const copy = [...prev];
        copy.splice(submitIdx, 0, b);
        return copy;
      }
      return [...prev, b];
    });
  }
  function addField(field: Exclude<FieldKey, "custom">) {
    addBlock({
      id: newBlockId(),
      type: "field",
      field,
      label: FIELD_META[field].label,
      placeholder: FIELD_META[field].placeholder,
      required: field === "name" || field === "phone",
    });
  }
  function addCustomField() {
    addBlock({
      id: newBlockId(),
      type: "field",
      field: "custom",
      label: "Yangi maydon",
      placeholder: "",
      required: false,
    });
  }
  function update(id: string, patch: Partial<LandingBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as LandingBlock) : b)));
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remove(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const usedFields = new Set(
    blocks.filter((b) => b.type === "field").map((b) => (b as { field: FieldKey }).field)
  );

  async function save() {
    setError("");
    setSaving(true);
    const res = await fetch(`/api/admin/landings/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, isPublished, blocks: JSON.stringify(blocks) }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Saqlashda xatolik");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Sarlavha qatori */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admins/landings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title || "Ariza sahifasi"}</h1>
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              ozodflow.uz/{slug} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onChange={setIsPublished} label="Chop etilgan" />
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saqlandi ✓" : "Saqlash"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      {/* Tablar */}
      <div className="flex gap-1 border-b border-border">
        <TabBtn active={tab === "build"} onClick={() => setTab("build")}>
          Konstruktor
        </TabBtn>
        <TabBtn active={tab === "subs"} onClick={() => setTab("subs")}>
          Arizalar
        </TabBtn>
      </div>

      {tab === "build" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Chap: sozlamalar + palitra */}
          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <div>
                <Label>Sahifa nomi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Havola (slug)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-2 text-xs text-muted">
                    ozodflow.uz/
                  </span>
                  <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Blok qo'shish</p>
              <div className="grid grid-cols-2 gap-2">
                <PaletteBtn
                  icon={Heading}
                  label="Sarlavha"
                  onClick={() => addBlock({ id: newBlockId(), type: "heading", text: "Sarlavha" })}
                />
                <PaletteBtn
                  icon={Type}
                  label="Matn"
                  onClick={() => addBlock({ id: newBlockId(), type: "text", text: "Matn..." })}
                />
                <PaletteBtn
                  icon={ImageIcon}
                  label="Rasm"
                  onClick={() => addBlock({ id: newBlockId(), type: "image", url: "" })}
                />
                <PaletteBtn
                  icon={MousePointerClick}
                  label="Tugma"
                  onClick={() =>
                    addBlock({ id: newBlockId(), type: "submit", text: "Yuborish" })
                  }
                  disabled={blocks.some((b) => b.type === "submit")}
                />
              </div>

              <p className="mb-2 mt-4 text-sm font-medium text-foreground">Maydonlar</p>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_ORDER.map((f) => (
                  <PaletteBtn
                    key={f}
                    icon={f === "phone" ? Phone : f === "telegram" ? Send : Plus}
                    label={FIELD_META[f].label}
                    onClick={() => addField(f)}
                    disabled={usedFields.has(f)}
                  />
                ))}
                <PaletteBtn icon={Plus} label="Boshqa maydon" onClick={addCustomField} />
              </div>
            </Card>

            <button
              onClick={() => setPreview((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground"
            >
              <Eye className="h-4 w-4" /> {preview ? "Tahrirlash" : "Ko'rinishni ko'rish"}
            </button>
          </div>

          {/* O'ng: bloklar ro'yxati / ko'rinish */}
          <div className="lg:col-span-2">
            {preview ? (
              <PreviewForm title={title} blocks={blocks} />
            ) : blocks.length === 0 ? (
              <Card className="flex flex-col items-center py-16 text-center text-muted">
                <MousePointerClick className="h-8 w-8 text-muted/40" />
                <p className="mt-2 text-sm">Chapdan blok qo'shing</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {blocks.map((b, i) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    first={i === 0}
                    last={i === blocks.length - 1}
                    onUpdate={(patch) => update(b.id, patch)}
                    onMove={(d) => move(b.id, d)}
                    onRemove={() => remove(b.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <SubmissionsTab pageId={page.id} views={page.views} />
      )}
    </div>
  );
}

// ─────────── Blok tahrirlagich ───────────
function BlockEditor({
  block: b,
  first,
  last,
  onUpdate,
  onMove,
  onRemove,
}: {
  block: LandingBlock;
  first: boolean;
  last: boolean;
  onUpdate: (patch: Partial<LandingBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const typeLabel: Record<LandingBlock["type"], string> = {
    heading: "Sarlavha",
    text: "Matn",
    image: "Rasm",
    field: "Maydon",
    submit: "Yuborish tugmasi",
  };
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {typeLabel[b.type]}
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn disabled={first} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </IconBtn>
          <IconBtn disabled={last} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={onRemove} danger>
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {b.type === "heading" && (
        <Input
          value={b.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Sarlavha matni"
          className="text-lg font-semibold"
        />
      )}
      {b.type === "text" && (
        <Textarea
          value={b.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={2}
          placeholder="Matn..."
        />
      )}
      {b.type === "image" && (
        <ImageUpload
          value={b.url}
          onChange={(url) => onUpdate({ url })}
          aspect="wide"
        />
      )}
      {b.type === "submit" && (
        <Input
          value={b.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Tugma matni"
        />
      )}
      {b.type === "field" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Yorliq</Label>
              <Input
                value={b.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                disabled={b.field !== "custom"}
              />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={b.placeholder}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={b.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-[var(--accent)]"
            />
            Majburiy maydon
          </label>
        </div>
      )}
    </Card>
  );
}

// ─────────── Ko'rinish (preview) ───────────
function PreviewForm({ title, blocks }: { title: string; blocks: LandingBlock[] }) {
  return (
    <Card className="mx-auto max-w-md p-6">
      {blocks.map((b) => {
        if (b.type === "heading")
          return (
            <h2 key={b.id} className="mb-2 text-2xl font-bold text-foreground">
              {b.text}
            </h2>
          );
        if (b.type === "text")
          return (
            <p key={b.id} className="mb-3 text-sm text-muted">
              {b.text}
            </p>
          );
        if (b.type === "image")
          return b.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={b.id} src={b.url} alt="" className="mb-3 w-full rounded-xl" />
          ) : null;
        if (b.type === "field")
          return (
            <div key={b.id} className="mb-3">
              <label className="mb-1 block text-sm font-medium text-foreground">
                {b.label} {b.required && <span className="text-error">*</span>}
              </label>
              <div className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm leading-[44px] text-muted">
                {b.placeholder}
              </div>
            </div>
          );
        if (b.type === "submit")
          return (
            <div
              key={b.id}
              className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent font-medium text-white"
            >
              {b.text}
            </div>
          );
        return null;
      })}
      {!blocks.some((b) => b.type === "submit") && (
        <p className="mt-3 text-center text-xs text-warning">
          ⚠ Yuborish tugmasi qo'shilmagan
        </p>
      )}
      <p className="sr-only">{title}</p>
    </Card>
  );
}

// ─────────── Arizalar tab ───────────
function SubmissionsTab({ pageId, views }: { pageId: string; views: number }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/landings/${pageId}/submissions`);
    const json = await res.json();
    if (json.success) setSubs(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markContacted(s: Submission) {
    setBusy(s.id);
    const res = await fetch(`/api/admin/landings/${pageId}/submissions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacted: true }),
    });
    setBusy(null);
    if (res.ok) setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, contacted: true } : x)));
  }

  async function removeSub(s: Submission) {
    if (!confirm("Ariza o'chirilsinmi?")) return;
    setBusy(s.id);
    await fetch(`/api/admin/landings/${pageId}/submissions/${s.id}`, { method: "DELETE" });
    setBusy(null);
    setSubs((prev) => prev.filter((x) => x.id !== s.id));
  }

  const newCount = subs.filter((s) => !s.contacted).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Kirishlar" value={views} icon={Eye} />
        <StatBox label="Arizalar" value={subs.length} icon={Users} />
        <StatBox label="Yangi" value={newCount} icon={Send} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : subs.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Users className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Hali ariza yo'q</p>
          <p className="mt-1 text-sm text-muted">Mijozlar to'ldirganda shu yerda ko'rinadi</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <SubmissionCard
              key={s.id}
              sub={s}
              busy={busy === s.id}
              onContacted={() => markContacted(s)}
              onRemove={() => removeSub(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  sub: s,
  busy,
  onContacted,
  onRemove,
}: {
  sub: Submission;
  busy: boolean;
  onContacted: () => void;
  onRemove: () => void;
}) {
  let extra: Record<string, string> = {};
  try {
    extra = s.extra ? JSON.parse(s.extra) : {};
  } catch {
    extra = {};
  }
  return (
    <Card className={`p-4 ${s.contacted ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {s.name} {s.lastName || ""}
            </p>
            {s.contacted ? (
              <Badge variant="success">
                <Check className="h-3 w-3" /> Gaplashilgan
              </Badge>
            ) : (
              <Badge variant="accent">Yangi</Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted">
            {s.phone && (
              <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                <Phone className="h-3.5 w-3.5" /> {s.phone}
              </a>
            )}
            {s.brand && <span>🏷 {s.brand}</span>}
            {s.telegram && (
              <a
                href={`https://t.me/${s.telegram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-accent"
              >
                <Send className="h-3.5 w-3.5" /> {s.telegram}
              </a>
            )}
            {Object.entries(extra).map(([k, v]) => (
              <span key={k}>
                {k}: {v}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {new Date(s.createdAt).toLocaleString("uz")}
          </p>
        </div>
        <button
          onClick={onRemove}
          disabled={busy}
          className="shrink-0 text-muted hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {!s.contacted && (
        <div className="mt-3 border-t border-border pt-3">
          <Button size="sm" onClick={onContacted} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Gaplashildi
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─────────── kichik yordamchilar ───────────
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PaletteBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Type;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted" /> {label}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 disabled:opacity-30 ${
        danger ? "hover:text-error" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}
