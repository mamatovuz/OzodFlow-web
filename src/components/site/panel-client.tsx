"use client";

import { useEffect, useState } from "react";
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
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  Search,
  Lock,
  BarChart3,
  MessageSquare,
  Mail,
  FolderGit2,
  Calendar,
  Sparkles,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import { RichEditor } from "@/components/site/rich-editor";
import { EditorEnhance } from "@/components/site/editor-enhance";
import { AdminStats } from "@/components/site/admin-stats";
import { AdminComments } from "@/components/site/admin-comments";
import { AdminMessages } from "@/components/site/admin-messages";
import { AdminProjects } from "@/components/site/admin-projects";
import { SITE_ICONS, iconFor } from "@/components/site/link-icons";
import type { SiteLink, SiteNavButton } from "@/lib/site";

type Post = {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  coverImage: string | null;
  status: "DRAFT" | "PUBLIC" | "SITE" | "UNLISTED";
  publishDate: string;
  views: number;
  likes: number;
  dislikes: number;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  tags: string[];
  password: string | null;
  series: string | null;
  seriesOrder: number;
  summary?: string | null;
  faq?: { q: string; a: string }[];
  translations?: Record<string, { title: string; html: string }>;
};

type Settings = {
  heroTitle: string;
  heroRole: string;
  heroTagline: string;
  heroImage: string;
  profileImage: string;
  aboutHtml: string;
  channel: string;
  links: SiteLink[];
  navButtons: SiteNavButton[];
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  favicon: string;
  siteName: string;
  siteUrl: string;
  tgBotToken: string;
  tgChannel: string;
};

const STATUS: { key: Post["status"]; label: string; hint: string }[] = [
  { key: "DRAFT", label: "Qoralama", hint: "Faqat sizga ko'rinadi" },
  { key: "PUBLIC", label: "Hammaga", hint: "Blog ro'yxatida chiqadi" },
  { key: "SITE", label: "Saytda", hint: "Bosh sahifada ham ajratiladi" },
  { key: "UNLISTED", label: "Yashirin", hint: "Ro'yxatda chiqmaydi, faqat havola bilan" },
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
  likes: 0,
  dislikes: 0,
  metaTitle: null,
  metaDescription: null,
  ogImage: null,
  tags: [],
  password: null,
  series: null,
  seriesOrder: 0,
  summary: null,
  faq: [],
  translations: {},
});

// API'dan kelgan xom postni (tags — JSON satr) mijoz shakliga keltiradi
function normalize(raw: Record<string, unknown>): Post {
  let tags: string[] = [];
  try {
    tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : JSON.parse(String(raw.tags || "[]"));
  } catch {
    tags = [];
  }
  let faq: { q: string; a: string }[] = [];
  try {
    const f = Array.isArray(raw.faq) ? raw.faq : JSON.parse(String(raw.faq || "[]"));
    if (Array.isArray(f)) faq = f.filter((x) => x && typeof x.q === "string" && typeof x.a === "string");
  } catch {
    faq = [];
  }
  let translations: Record<string, { title: string; html: string }> = {};
  try {
    const t = typeof raw.translations === "object" && raw.translations ? raw.translations : JSON.parse(String(raw.translations || "{}"));
    if (t && typeof t === "object") translations = t as Record<string, { title: string; html: string }>;
  } catch {
    translations = {};
  }
  return { ...(raw as unknown as Post), tags, faq, translations };
}

// ISO sanani datetime-local input formatiga (mahalliy vaqt) o'giradi
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [tab, setTab] = useState<"dashboard" | "posts" | "comments" | "messages" | "projects" | "settings">("dashboard");
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // ── Editor holati ──
  const [draft, setDraft] = useState<Post | null>(null);
  const [docId, setDocId] = useState("new");
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [ogBusy, setOgBusy] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [restored, setRestored] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  async function runAi(mode: "generate" | "improve") {
    if (!draft) return;
    setAiBusy(true);
    const res = await fetch("/api/site/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "generate" ? { mode, topic: aiTopic } : { mode, current: draft.contentHtml }),
    });
    const json = await res.json().catch(() => ({}));
    setAiBusy(false);
    if (!res.ok) return alert(json.error || "AI xatosi");
    const d = json.data;
    setDraft((cur) =>
      cur
        ? {
            ...cur,
            title: cur.title || d.title || "",
            contentHtml: d.contentHtml || cur.contentHtml,
            excerpt: d.excerpt || cur.excerpt,
            tags: cur.tags.length ? cur.tags : d.tags || [],
          }
        : cur
    );
    setDocId("ai-" + Date.now()); // editor mazmunini yangilash uchun
    setAiOpen(false);
    setAiTopic("");
  }

  const filtered = posts.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  // Avtosaqlash: ochiq yozuvni localStorage'ga yozamiz (yo'qolib qolmasin)
  useEffect(() => {
    if (!draft) return;
    try {
      localStorage.setItem("ozod-draft-active", JSON.stringify({ draft, docId }));
    } catch {}
  }, [draft, docId]);

  // Sahifa qayta ochilganda saqlangan yozuvni tiklaymiz
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ozod-draft-active");
      if (raw) {
        const { draft: d, docId: id } = JSON.parse(raw);
        if (d) {
          setDraft(d);
          setDocId(id || "restored-" + Date.now());
          setRestored(true);
          setTimeout(() => setRestored(false), 4000);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      localStorage.removeItem("ozod-draft-active");
    } catch {}
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
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      ogImage: draft.ogImage,
      tags: draft.tags,
      password: draft.password,
      series: draft.series,
      seriesOrder: draft.seriesOrder,
      publishDate: draft.publishDate,
      summary: draft.summary,
      faq: draft.faq || [],
    };
    const res = await fetch(draft.id ? `/api/site/posts/${draft.id}` : "/api/site/posts", {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return alert(json.error || "Saqlanmadi");
    try {
      localStorage.removeItem(`ozod-draft-${docId}`);
    } catch {}
    const saved: Post = normalize(json.data);
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

  async function onOgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !draft) return;
    setOgBusy(true);
    const url = await uploadImage(file);
    setOgBusy(false);
    if (url) setDraft({ ...draft, ogImage: url });
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
        {restored && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Saqlanmagan yozuv tiklandi. Davom eting yoki yopib tashlang.
          </div>
        )}

        {/* Tablar */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border p-1">
          <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<BarChart3 className="h-4 w-4" />}>
            Boshqaruv
          </TabBtn>
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")} icon={<FileText className="h-4 w-4" />}>
            Yozuvlar
          </TabBtn>
          <TabBtn active={tab === "comments"} onClick={() => setTab("comments")} icon={<MessageSquare className="h-4 w-4" />}>
            Izohlar
          </TabBtn>
          <TabBtn active={tab === "messages"} onClick={() => setTab("messages")} icon={<Mail className="h-4 w-4" />}>
            Xabarlar
          </TabBtn>
          <TabBtn active={tab === "projects"} onClick={() => setTab("projects")} icon={<FolderGit2 className="h-4 w-4" />}>
            Loyihalar
          </TabBtn>
          <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings className="h-4 w-4" />}>
            Sozlamalar
          </TabBtn>
        </div>

        {tab === "dashboard" && <AdminStats onGoto={(t) => setTab(t)} />}
        {tab === "comments" && <AdminComments />}
        {tab === "messages" && <AdminMessages />}
        {tab === "projects" && <AdminProjects />}

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

                {/* AI yordamchi */}
                <div className="mt-3">
                  {!aiOpen ? (
                    <button
                      type="button"
                      onClick={() => setAiOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/10"
                    >
                      <Sparkles className="h-4 w-4" /> AI bilan yozish
                    </button>
                  ) : (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                          <Sparkles className="h-4 w-4" /> AI yordamchi
                        </span>
                        <button type="button" onClick={() => setAiOpen(false)} className="text-muted hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="Mavzu: masalan 'React hooks nima uchun kerak'"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runAi("generate")}
                          disabled={aiBusy || !aiTopic.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                        >
                          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Maqola yaratish
                        </button>
                        <button
                          type="button"
                          onClick={() => runAi("improve")}
                          disabled={aiBusy || !draft.contentHtml.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm hover:border-foreground disabled:opacity-50"
                        >
                          <Wand2 className="h-4 w-4" /> Matnni yaxshilash
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-muted">AI yozganini tekshirib, tahrirlab chiqing.</p>
                    </div>
                  )}
                </div>

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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

                {/* Teglar */}
                <div className="mt-5">
                  <label className="text-xs text-muted">Teglar (Enter yoki vergul bilan)</label>
                  <TagInput tags={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} />
                </div>

                {/* Qulf (parol) */}
                <div className="mt-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <Lock className="h-3.5 w-3.5" /> Parol bilan qulflash (ixtiyoriy)
                  </label>
                  <input
                    value={draft.password || ""}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value || null })}
                    placeholder="Bo'sh — hamma o'qiydi. Parol — faqat bilgan ochadi"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                  {draft.password && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      🔒 Bu maqola qulflangan — ochish uchun ushbu parol so'raladi.
                    </p>
                  )}
                </div>

                {/* Nashr sanasi (rejalashtirish) + turkum */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <Calendar className="h-3.5 w-3.5" /> Nashr sanasi (kelajakka qo'ysangiz — rejalashtiriladi)
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalInput(draft.publishDate)}
                      onChange={(e) =>
                        setDraft({ ...draft, publishDate: e.target.value ? new Date(e.target.value).toISOString() : draft.publishDate })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    {new Date(draft.publishDate) > new Date() && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⏰ Bu sana kelganda avtomatik chiqadi.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-muted">Turkum (ixtiyoriy)</label>
                      <input
                        value={draft.series || ""}
                        onChange={(e) => setDraft({ ...draft, series: e.target.value || null })}
                        placeholder="masalan: React darslari"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">Tartib</label>
                      <input
                        type="number"
                        value={draft.seriesOrder}
                        onChange={(e) => setDraft({ ...draft, seriesOrder: parseInt(e.target.value) || 0 })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* SEO / ulashish — har bir maqolaning o'z sarlavha/tavsif/rasmi */}
                <div className="mt-5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setSeoOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted" /> SEO va ulashish (ixtiyoriy)
                    </span>
                    {seoOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                  </button>
                  {seoOpen && (
                    <div className="space-y-4 border-t border-border p-4">
                      <p className="text-xs text-muted">
                        Bo'sh qoldirsangiz — sarlavha, qisqacha va muqova rasmidan avtomatik olinadi.
                        Ulashilganda (Telegram, Google) shu ma'lumot ko'rinadi.
                      </p>
                      <div>
                        <label className="text-xs text-muted">Ulashish sarlavhasi</label>
                        <input
                          value={draft.metaTitle || ""}
                          onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
                          placeholder={draft.title || "Sarlavha"}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted">Ulashish tavsifi</label>
                        <textarea
                          value={draft.metaDescription || ""}
                          onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                          rows={2}
                          placeholder="Qisqa tavsif..."
                          className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted">Ulashish rasmi (OG image)</label>
                        <div className="mt-1.5 flex items-center gap-3">
                          {draft.ogImage ? (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={draft.ogImage} alt="" className="h-16 rounded-lg object-cover" />
                              <button
                                onClick={() => setDraft({ ...draft, ogImage: null })}
                                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted">Yo'q bo'lsa avtomatik chiroyli rasm chiziladi.</p>
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-foreground hover:text-foreground">
                            {ogBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                            Rasm yuklash
                            <input type="file" accept="image/*" hidden onChange={onOgImage} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI boyitish, FAQ, tarjima, versiyalar */}
                <EditorEnhance draft={draft} onPatch={(p) => setDraft((d) => (d ? { ...d, ...p } : d))} />

                {/* Statistika (tahrirlashda) */}
                {draft.id && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <MiniStat icon={<Eye className="h-4 w-4" />} value={draft.views} label="Ko'rish" />
                    <MiniStat icon={<ThumbsUp className="h-4 w-4" />} value={draft.likes} label="Yoqdi" />
                    <MiniStat icon={<ThumbsDown className="h-4 w-4" />} value={draft.dislikes} label="Yoqmadi" />
                  </div>
                )}

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

            {/* Qidiruv */}
            {posts.length > 0 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Yozuvlarni qidirish..."
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <button
                  onClick={() => setShowCal((v) => !v)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    showCal ? "border-foreground bg-surface-2" : "border-border text-muted hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-4 w-4" /> Kalendar
                </button>
                <span className="shrink-0 text-sm text-muted">{filtered.length} ta</span>
              </div>
            )}

            {/* Kontent kalendari */}
            {showCal && posts.length > 0 && <ContentCalendar posts={posts} onEdit={startEdit} />}

            {/* Ro'yxat */}
            <div className="mt-4 space-y-2">
              {posts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted">
                  Hali yozuv yo'q. Birinchisini yozing.
                </p>
              ) : filtered.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
                  Topilmadi.
                </p>
              ) : (
                filtered.map((p) => (
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
                        {new Date(p.publishDate) > new Date() && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <Calendar className="h-3 w-3" /> Rejalashtirilgan
                          </span>
                        )}
                        {p.password && <Lock className="h-3 w-3 shrink-0 text-muted" />}
                        {p.series && <span className="shrink-0 text-[11px] text-muted">📚 {p.series}</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {p.likes}</span>
                        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" /> {p.dislikes}</span>
                        <span className="truncate">/{p.slug}</span>
                      </div>
                    </div>
                    {(p.status === "PUBLIC" || p.status === "SITE") && new Date(p.publishDate) <= new Date() && (
                      <PostShare siteUrl={initialSettings.siteUrl} slug={p.slug} title={p.title} />
                    )}
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
      className={`flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
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
    UNLISTED: { label: "Yashirin", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  }[status];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>{map.label}</span>;
}

function SettingsTab({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [busyKey, setBusyKey] = useState<string>("");

  const FIELD_OF: Record<string, keyof Settings> = {
    hero: "heroImage",
    profile: "profileImage",
    og: "ogImage",
    favicon: "favicon",
  };

  async function pick(kind: "hero" | "profile" | "og" | "favicon", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyKey(kind);
    const url = await uploadImage(file);
    setBusyKey("");
    if (url) setS((v) => ({ ...v, [FIELD_OF[kind]]: url }));
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
            busy={busyKey === "profile"}
            onPick={(e) => pick("profile", e)}
          />
          <ImageField
            label="Bosh sahifa rasmi"
            url={s.heroImage}
            busy={busyKey === "hero"}
            onPick={(e) => pick("hero", e)}
          />
        </div>
      </section>

      {/* Sayt SEO / ulashish */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Sayt SEO va ulashish</h2>
        <p className="mt-0.5 text-sm text-muted">
          Telegram/Google'ga tashlanganda ko'rinadigan nom, tavsif, rasm va favicon. Endi OzodFlow emas, o'zingizniki chiqadi.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">Sayt nomi</label>
            <input value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} className={field} placeholder="Ozodbek's Blog" />
          </div>
          <div>
            <label className="text-xs text-muted">Bosh sahifa sarlavhasi (title)</label>
            <input value={s.metaTitle} onChange={(e) => setS({ ...s, metaTitle: e.target.value })} className={field} />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-muted">Tavsif (description)</label>
          <textarea
            value={s.metaDescription}
            onChange={(e) => setS({ ...s, metaDescription: e.target.value })}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ImageField
            label="Ulashish rasmi (OG — bo'sh bo'lsa avto)"
            url={s.ogImage || "/site/hero.jpg"}
            busy={busyKey === "og"}
            onPick={(e) => pick("og", e)}
            onClear={s.ogImage ? () => setS({ ...s, ogImage: "" }) : undefined}
          />
          <ImageField
            label="Favicon (tab ikonkasi)"
            url={s.favicon || "/site/profile.jpg"}
            round
            busy={busyKey === "favicon"}
            onPick={(e) => pick("favicon", e)}
            onClear={s.favicon ? () => setS({ ...s, favicon: "" }) : undefined}
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

      {/* Ijtimoiy havolalar — qo'shish/o'chirish + ikonka tanlash */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Havolalar</h2>
            <p className="mt-0.5 text-sm text-muted">Bosh sahifa va "Men haqimda"da chiqadi.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setS((v) => ({
                ...v,
                links: [...v.links, { id: `l${Date.now()}`, icon: "link", url: "", label: "" }],
              }))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-foreground"
          >
            <Plus className="h-4 w-4" /> Qo'shish
          </button>
        </div>

        {s.links.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted">
            Havola yo'q. "Qo'shish" bosing.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {s.links.map((ln, idx) => {
              const Icon = iconFor(ln.icon);
              const patch = (p: Partial<SiteLink>) =>
                setS((v) => ({ ...v, links: v.links.map((x) => (x.id === ln.id ? { ...x, ...p } : x)) }));
              const move = (dir: -1 | 1) =>
                setS((v) => {
                  const arr = [...v.links];
                  const j = idx + dir;
                  if (j < 0 || j >= arr.length) return v;
                  [arr[idx], arr[j]] = [arr[j], arr[idx]];
                  return { ...v, links: arr };
                });
              return (
                <div key={ln.id} className="rounded-xl border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                      <Icon className="h-4 w-4" />
                    </span>
                    <select
                      value={ln.icon}
                      onChange={(e) => patch({ icon: e.target.value })}
                      className="h-9 shrink-0 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-foreground"
                    >
                      {SITE_ICONS.map((i) => (
                        <option key={i.key} value={i.key}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={ln.url}
                      onChange={(e) => patch({ url: e.target.value })}
                      placeholder="https://..."
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
                    />
                    <div className="flex shrink-0 items-center">
                      <button type="button" onClick={() => move(-1)} disabled={idx === 0} className="rounded-md p-1.5 text-muted hover:text-foreground disabled:opacity-30" title="Yuqoriga">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => move(1)} disabled={idx === s.links.length - 1} className="rounded-md p-1.5 text-muted hover:text-foreground disabled:opacity-30" title="Pastga">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setS((v) => ({ ...v, links: v.links.filter((x) => x.id !== ln.id) }))}
                        className="rounded-md p-1.5 text-muted hover:text-red-500"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <label className="text-xs text-muted">Navbar "Kanal" havolasi (ixtiyoriy)</label>
          <input value={s.channel} onChange={(e) => setS({ ...s, channel: e.target.value })} className={field} placeholder="https://t.me/..." />
        </div>
      </section>

      {/* Navbar qo'shimcha tugmalari */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Navbar tugmalari</h2>
            <p className="mt-0.5 text-sm text-muted">Yuqoridagi menyuga qo'shimcha havola tugmalari.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setS((v) => ({
                ...v,
                navButtons: [...v.navButtons, { id: `n${Date.now()}`, label: "", url: "", external: true }],
              }))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-foreground"
          >
            <Plus className="h-4 w-4" /> Qo'shish
          </button>
        </div>

        {s.navButtons.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted">
            Tugma yo'q. "Qo'shish" bosing.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {s.navButtons.map((b) => {
              const patch = (p: Partial<SiteNavButton>) =>
                setS((v) => ({ ...v, navButtons: v.navButtons.map((x) => (x.id === b.id ? { ...x, ...p } : x)) }));
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
                  <input
                    value={b.label}
                    onChange={(e) => patch({ label: e.target.value })}
                    placeholder="Tugma nomi"
                    className="h-9 w-28 shrink-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
                  />
                  <input
                    value={b.url}
                    onChange={(e) => patch({ url: e.target.value })}
                    placeholder="https://... yoki /blog"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setS((v) => ({ ...v, navButtons: v.navButtons.filter((x) => x.id !== b.id) }))}
                    className="rounded-md p-1.5 text-muted hover:text-red-500"
                    title="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Telegram avto-post */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Telegram avto-post</h2>
        <p className="mt-0.5 text-sm text-muted">
          Yangi maqola e'lon qilinganda kanalga avtomatik tashlanadi. Bot tokenini @BotFather'dan oling,
          botni kanalga admin qiling.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">Bot tokeni</label>
            <input value={s.tgBotToken} onChange={(e) => setS({ ...s, tgBotToken: e.target.value })} className={field} placeholder="123456:ABC-..." />
          </div>
          <div>
            <label className="text-xs text-muted">Kanal (@kanal yoki -100...)</label>
            <input value={s.tgChannel} onChange={(e) => setS({ ...s, tgChannel: e.target.value })} className={field} placeholder="@mening_kanalim" />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <label className="text-xs font-medium text-amber-600 dark:text-amber-400">Saytning haqiqiy domeni</label>
          <input
            value={s.siteUrl}
            onChange={(e) => setS({ ...s, siteUrl: e.target.value })}
            className={field}
            placeholder="https://ozodbeck.uz"
          />
          <p className="mt-1.5 text-xs text-muted">
            <b>sitemap.xml</b>, <b>robots.txt</b>, canonical havolalar, Telegram va email — barchasida shu
            domen ishlatiladi. Bo'sh qoldirsangiz railway manzili (ozodbek.up.railway.app) ko'rinib
            qolishi mumkin. To'liq yozing: <b>https://ozodbeck.uz</b>
          </p>
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
  onClear,
}: {
  label: string;
  url: string;
  round?: boolean;
  busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
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
        {onClear && (
          <button type="button" onClick={onClear} className="rounded-lg p-2 text-muted hover:text-red-500" title="Tozalash">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-background py-3">
      <span className="text-muted">{icon}</span>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, "").slice(0, 24);
    if (t && !tags.includes(t) && tags.length < 12) onChange([...tags, t]);
    setValue("");
  };
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-2">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-muted hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(value);
          } else if (e.key === "Backspace" && !value && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => value && add(value)}
        placeholder={tags.length ? "" : "react, javascript, hayot..."}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

// Maqolani ijtimoiy tarmoqlarga qo'lda ulashish (X, LinkedIn, Telegram, nusxa)
function PostShare({ siteUrl, slug, title }: { siteUrl: string; slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function fullUrl() {
    const origin = (siteUrl || "").trim().replace(/\/+$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
    return `${/^https?:\/\//i.test(origin) ? origin : `https://${origin}`}/blog/${slug}`;
  }

  const url = fullUrl();
  const links = [
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        title="Ulashish"
      >
        <Share2 className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-surface-2"
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              {copied ? "✓ Nusxa olindi" : "Havoladan nusxa"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Kontent kalendari — postlar (va rejalashtirilganlar) oylik ko'rinishda
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

function ContentCalendar({ posts, onEdit }: { posts: Post[]; onEdit: (p: Post) => void }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const byDay = new Map<string, Post[]>();
  for (const p of posts) {
    const d = new Date(p.publishDate);
    if (d.getFullYear() === ym.y && d.getMonth() === ym.m) {
      const key = String(d.getDate());
      const arr = byDay.get(key) || [];
      arr.push(p);
      byDay.set(key, arr);
    }
  }

  const first = new Date(ym.y, ym.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Dushanba = 0
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function shift(delta: number) {
    setYm(({ y, m }) => {
      const nm = m + delta;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  const todayKey = now.getFullYear() === ym.y && now.getMonth() === ym.m ? now.getDate() : -1;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS_UZ[ym.m]} {ym.y}
        </span>
        <button onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const items = byDay.get(String(d)) || [];
          const isToday = d === todayKey;
          return (
            <div
              key={d}
              className={`min-h-[62px] rounded-lg border p-1 text-left ${isToday ? "border-accent/50 bg-accent/5" : "border-border/60"}`}
            >
              <div className={`text-[11px] ${isToday ? "font-bold text-accent" : "text-muted"}`}>{d}</div>
              <div className="mt-0.5 space-y-0.5">
                {items.slice(0, 3).map((p) => {
                  const future = new Date(p.publishDate) > now;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onEdit(p)}
                      title={p.title}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight ${
                        future
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : p.status === "DRAFT"
                            ? "bg-surface-2 text-muted"
                            : "bg-accent/15 text-accent"
                      }`}
                    >
                      {p.title}
                    </button>
                  );
                })}
                {items.length > 3 && <span className="block px-1 text-[10px] text-muted">+{items.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-accent/40" /> E'lon qilingan</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" /> Rejalashtirilgan</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-surface-2" /> Qoralama</span>
      </div>
    </div>
  );
}
