"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  LogOut,
  Loader2,
  ImagePlus,
  Check,
  X,
  FileText,
  Settings,
} from "lucide-react";
import { RichEditor } from "@/components/site/rich-editor";

type Post = {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  coverImage: string | null;
  status: "DRAFT" | "PUBLIC" | "SITE";
  publishDate: string;
  views: number;
};

type Settings = {
  heroTitle: string;
  heroRole: string;
  heroTagline: string;
  heroImage: string;
  profileImage: string;
  aboutHtml: string;
  youtube: string;
  github: string;
  linkedin: string;
  telegram: string;
  channel: string;
};

const STATUS: { key: Post["status"]; label: string; hint: string }[] = [
  { key: "DRAFT", label: "Qoralama", hint: "Faqat sizga ko'rinadi" },
  { key: "PUBLIC", label: "Hammaga", hint: "Blog ro'yxatida chiqadi" },
  { key: "SITE", label: "Saytda", hint: "Bosh sahifada ham ajratiladi" },
];

const emptyDraft = (): Post => ({
  id: "",
  slug: "",
  title: "",
  contentHtml: "",
  excerpt: "",
  coverImage: null,
  status: "DRAFT",
  publishDate: new Date().toISOString(),
  views: 0,
});

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/site/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(json.error || "Rasm yuklanmadi");
    return null;
  }
  return json.data?.url || null;
}

export function PanelClient({
  base,
  initialPosts,
  initialSettings,
}: {
  base: string;
  initialPosts: Post[];
  initialSettings: Settings;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "settings">("posts");
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // ── Editor holati ──
  const [draft, setDraft] = useState<Post | null>(null);
  const [docId, setDocId] = useState("new");
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);

  function startNew() {
    setDraft(emptyDraft());
    setDocId("new-" + Date.now());
    setTab("posts");
  }
  function startEdit(p: Post) {
    setDraft({ ...p });
    setDocId(p.id);
    setTab("posts");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeEditor() {
    setDraft(null);
  }

  async function savePost() {
    if (!draft) return;
    if (!draft.title.trim()) return alert("Sarlavha kiriting");
    setSaving(true);
    const payload = {
      title: draft.title,
      slug: draft.slug || undefined,
      contentHtml: draft.contentHtml,
      coverImage: draft.coverImage,
      status: draft.status,
    };
    const res = await fetch(draft.id ? `/api/site/posts/${draft.id}` : "/api/site/posts", {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return alert(json.error || "Saqlanmadi");
    const saved: Post = json.data;
    setPosts((prev) => {
      const others = prev.filter((p) => p.id !== saved.id);
      return [saved, ...others].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    });
    setDraft(null);
  }

  async function deletePost(id: string) {
    if (!confirm("Bu yozuvni o'chirasizmi?")) return;
    const res = await fetch(`/api/site/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (draft?.id === id) setDraft(null);
    }
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !draft) return;
    setCoverBusy(true);
    const url = await uploadImage(file);
    setCoverBusy(false);
    if (url) setDraft({ ...draft, coverImage: url });
  }

  async function logout() {
    await fetch("/api/site/logout", { method: "POST" });
    router.push(`${base}/panel/login`);
    router.refresh();
  }

  return (
    <div className="site-root min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <h1 className="text-base font-bold tracking-tight">Studio</h1>
          <div className="flex items-center gap-2">
            <a
              href={base || "/"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Saytni ko'rish
            </a>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Tablar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border p-1">
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")} icon={<FileText className="h-4 w-4" />}>
            Yozuvlar
          </TabBtn>
          <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings className="h-4 w-4" />}>
            Sayt sozlamalari
          </TabBtn>
        </div>

        {tab === "posts" && (
          <>
            {draft ? (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">{draft.id ? "Yozuvni tahrirlash" : "Yangi yozuv"}</h2>
                  <button onClick={closeEditor} className="text-muted hover:text-foreground" title="Yopish">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Sarlavha"
                  className="w-full border-none bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted/50"
                />

                {/* Muqova rasmi */}
                <div className="mt-4">
                  {draft.coverImage ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.coverImage} alt="" className="h-32 rounded-xl object-cover" />
                      <button
                        onClick={() => setDraft({ ...draft, coverImage: null })}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-foreground hover:text-foreground">
                      {coverBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      Muqova rasmi
                      <input type="file" accept="image/*" hidden onChange={onCover} />
                    </label>
                  )}
                </div>

                {/* Matn */}
                <div className="mt-4">
                  <RichEditor
                    docId={docId}
                    initialHtml={draft.contentHtml}
                    onChange={(html) => setDraft((d) => (d ? { ...d, contentHtml: html } : d))}
                    onUpload={uploadImage}
                  />
                </div>

                {/* Slug */}
                <div className="mt-4">
                  <label className="text-xs text-muted">Havola (ixtiyoriy)</label>
                  <input
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    placeholder="avtomatik-hosil-boladi"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </div>

                {/* Ko'rinish holati */}
                <div className="mt-5">
                  <div className="mb-2 text-xs text-muted">Ko'rinish</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {STATUS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, status: s.key })}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          draft.status === s.key ? "border-foreground bg-surface-2" : "border-border hover:border-foreground/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.label}</span>
                          {draft.status === s.key && <Check className="h-4 w-4" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={savePost}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {draft.id ? "Yangilash" : "Saqlash"}
                  </button>
                  <button onClick={closeEditor} className="rounded-lg border border-border px-5 py-2.5 text-sm">
                    Bekor qilish
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={startNew}
                className="mb-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Yangi yozuv
              </button>
            )}

            {/* Ro'yxat */}
            <div className="mt-6 space-y-2">
              {posts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted">
                  Hali yozuv yo'q. Birinchisini yozing.
                </p>
              ) : (
                posts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
                  >
                    {p.coverImage && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.coverImage} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{p.title}</h3>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        /{p.slug} · {p.views} ko'rish
                      </p>
                    </div>
                    <button onClick={() => startEdit(p)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground" title="Tahrirlash">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deletePost(p.id)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-red-500" title="O'chirish">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "settings" && <SettingsTab initial={initialSettings} />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Post["status"] }) {
  const map = {
    DRAFT: { label: "Qoralama", cls: "bg-surface-2 text-muted" },
    PUBLIC: { label: "Hammaga", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    SITE: { label: "Saytda", cls: "bg-accent/15 text-accent" },
  }[status];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>{map.label}</span>;
}

function SettingsTab({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const [avaBusy, setAvaBusy] = useState(false);

  async function pick(kind: "hero" | "profile", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (kind === "hero") setHeroBusy(true);
    else setAvaBusy(true);
    const url = await uploadImage(file);
    if (kind === "hero") setHeroBusy(false);
    else setAvaBusy(false);
    if (url) setS((v) => ({ ...v, [kind === "hero" ? "heroImage" : "profileImage"]: url }));
  }

  async function save() {
    setSaving(true);
    setOk(false);
    const res = await fetch("/api/site/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaving(false);
    if (res.ok) {
      setOk(true);
      router.refresh();
      setTimeout(() => setOk(false), 2500);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Saqlanmadi");
    }
  }

  const field = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      {/* Bosh sahifa */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Bosh sahifa</h2>
        <p className="mt-0.5 text-sm text-muted">Ism, kasb, shior va rasmlar.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">Ism</label>
            <input value={s.heroTitle} onChange={(e) => setS({ ...s, heroTitle: e.target.value })} className={field} />
          </div>
          <div>
            <label className="text-xs text-muted">Kasb / rol</label>
            <input value={s.heroRole} onChange={(e) => setS({ ...s, heroRole: e.target.value })} className={field} />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted">Shior (tagline)</label>
          <input value={s.heroTagline} onChange={(e) => setS({ ...s, heroTagline: e.target.value })} className={field} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ImageField
            label="Profil rasmi (dumaloq)"
            url={s.profileImage}
            round
            busy={avaBusy}
            onPick={(e) => pick("profile", e)}
          />
          <ImageField
            label="Bosh sahifa rasmi"
            url={s.heroImage}
            busy={heroBusy}
            onPick={(e) => pick("hero", e)}
          />
        </div>
      </section>

      {/* Men haqimda */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Men haqimda</h2>
        <p className="mt-0.5 text-sm text-muted">"Men haqimda" sahifasi matni.</p>
        <div className="mt-4">
          <RichEditor
            docId="about"
            initialHtml={s.aboutHtml}
            onChange={(html) => setS((v) => ({ ...v, aboutHtml: html }))}
            onUpload={uploadImage}
          />
        </div>
      </section>

      {/* Ijtimoiy havolalar */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Havolalar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["youtube", "github", "linkedin", "telegram", "channel"] as const).map((k) => (
            <div key={k}>
              <label className="text-xs capitalize text-muted">{k === "channel" ? "Telegram kanal" : k}</label>
              <input value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={field} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
        </button>
        {ok && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Saqlandi
          </span>
        )}
      </div>
    </div>
  );
}

function ImageField({
  label,
  url,
  round,
  busy,
  onPick,
}: {
  label: string;
  url: string;
  round?: boolean;
  busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted">{label}</label>
      <div className="mt-1.5 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className={`h-16 w-16 object-cover ${round ? "rounded-full" : "rounded-lg"} ring-1 ring-border`}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-foreground hover:text-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          O'zgartirish
          <input type="file" accept="image/*" hidden onChange={onPick} />
        </label>
      </div>
    </div>
  );
}
