"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, ImagePlus, X, Pencil } from "lucide-react";

type Project = {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  tags: string[];
};

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/site/upload", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(j.error || "Rasm yuklanmadi");
    return null;
  }
  return j.data?.url || null;
}

function toArr(t: unknown): string[] {
  if (Array.isArray(t)) return t as string[];
  try {
    return JSON.parse(String(t || "[]"));
  } catch {
    return [];
  }
}

export function AdminProjects() {
  const [items, setItems] = useState<Project[] | null>(null);
  const [draft, setDraft] = useState<Partial<Project> & { tagsText?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  useEffect(() => {
    fetch("/api/site/projects")
      .then((r) => r.json())
      .then((j) => setItems((j.data || []).map((p: Project) => ({ ...p, tags: toArr(p.tags) }))))
      .catch(() => setItems([]));
  }, []);

  function startNew() {
    setDraft({ title: "", description: "", url: "", image: null, tagsText: "" });
  }
  function startEdit(p: Project) {
    setDraft({ ...p, tagsText: p.tags.join(", ") });
  }

  async function save() {
    if (!draft?.title?.trim()) return alert("Nom kiriting");
    setBusy(true);
    const tags = (draft.tagsText || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
    const payload = { title: draft.title, description: draft.description || "", url: draft.url || "", image: draft.image || null, tags };
    const editing = !!draft.id;
    const res = await fetch(editing ? `/api/site/projects/${draft.id}` : "/api/site/projects", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j.error || "Saqlanmadi");
    const saved = { ...j.data, tags: toArr(j.data.tags) };
    setItems((p) => {
      const others = (p || []).filter((x) => x.id !== saved.id);
      return editing ? (p || []).map((x) => (x.id === saved.id ? saved : x)) : [...others, saved];
    });
    setDraft(null);
  }

  async function del(id: string) {
    if (!confirm("Loyihani o'chirasizmi?")) return;
    const res = await fetch(`/api/site/projects/${id}`, { method: "DELETE" });
    if (res.ok) setItems((p) => (p || []).filter((x) => x.id !== id));
  }

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !draft) return;
    setImgBusy(true);
    const url = await uploadImage(file);
    setImgBusy(false);
    if (url) setDraft({ ...draft, image: url });
  }

  if (!items) {
    return <div className="flex justify-center py-20 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const field = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

  return (
    <div>
      {draft ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{draft.id ? "Loyihani tahrirlash" : "Yangi loyiha"}</h2>
            <button onClick={() => setDraft(null)} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted">Nomi</label>
              <input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={field} />
            </div>
            <div>
              <label className="text-xs text-muted">Tavsif</label>
              <textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className={`${field} resize-y`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted">Havola (URL)</label>
                <input value={draft.url || ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." className={field} />
              </div>
              <div>
                <label className="text-xs text-muted">Teglar (vergul bilan)</label>
                <input value={draft.tagsText || ""} onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })} placeholder="React, Next.js" className={field} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted">Rasm</label>
              <div className="mt-1.5 flex items-center gap-3">
                {draft.image ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image} alt="" className="h-16 rounded-lg object-cover" />
                    <button onClick={() => setDraft({ ...draft, image: null })} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-foreground hover:text-foreground">
                  {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Rasm
                  <input type="file" accept="image/*" hidden onChange={onImage} />
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
              </button>
              <button onClick={() => setDraft(null)} className="rounded-lg border border-border px-5 py-2.5 text-sm">Bekor</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={startNew} className="mb-5 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90">
          <Plus className="h-4 w-4" /> Yangi loyiha
        </button>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted">Loyiha yo'q.</p>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
              {p.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{p.title}</h3>
                <p className="truncate text-xs text-muted">{p.url || p.description || "—"}</p>
              </div>
              <button onClick={() => startEdit(p)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(p.id)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
