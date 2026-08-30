"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Eye,
  Users,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { Button, Card, Input, Label, Badge } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { TEMPLATES } from "@/lib/landing-blocks";
import { slugify } from "@/lib/utils";

type Page = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  views: number;
  submissionCount: number;
  newCount: number;
};

export function LandingManager() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tpl, setTpl] = useState(TEMPLATES[0].key);

  async function load() {
    const res = await fetch("/api/admin/landings");
    const json = await res.json();
    if (json.success) setPages(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openModal() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setTpl(TEMPLATES[0].key);
    setError("");
    setModal(true);
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Sahifa nomini kiriting");
    const template = TEMPLATES.find((t) => t.key === tpl) || TEMPLATES[0];
    setSaving(true);
    const res = await fetch("/api/admin/landings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug || undefined,
        blocks: JSON.stringify(template.blocks()),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setModal(false);
    router.push(`/admins/landings/${json.data.id}`);
  }

  async function togglePublish(p: Page) {
    setBusy(p.id);
    await fetch(`/api/admin/landings/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    });
    setBusy(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Sahifa va barcha arizalari o'chirilsinmi?")) return;
    setBusy(id);
    await fetch(`/api/admin/landings/${id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" /> Yangi sahifa
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : pages.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Hali ariza sahifasi yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Tayyor shablondan foydalanib birinchi sahifangizni yasang
          </p>
          <Button onClick={openModal} className="mt-4">
            <Plus className="h-4 w-4" /> Yangi sahifa
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-foreground">{p.title}</h3>
                  {p.isPublished ? (
                    <Badge variant="success">Chop etilgan</Badge>
                  ) : (
                    <Badge variant="warning">Qoralama</Badge>
                  )}
                  {p.newCount > 0 && (
                    <Badge variant="accent">{p.newCount} yangi</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-accent">ozodflow.uz/{p.slug}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {p.views} kirish
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {p.submissionCount} ariza
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={`/admins/landings/${p.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-surface-2"
                >
                  <Pencil className="h-4 w-4" /> Ochish
                </Link>
                {p.isPublished && (
                  <a
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => togglePublish(p)}
                  disabled={busy === p.id}
                  className="hidden h-9 items-center rounded-lg px-2 text-xs text-accent hover:underline sm:flex"
                >
                  {p.isPublished ? "Yashirish" : "Chop etish"}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  disabled={busy === p.id}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi ariza sahifasi">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
          )}
          <div>
            <Label>Sahifa nomi</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Masalan: Bepul konsultatsiya"
              required
            />
          </div>
          <div>
            <Label>Havola (slug)</Label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-2 text-sm text-muted">
                ozodflow.uz/
              </span>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="konsultatsiya"
              />
            </div>
          </div>
          <div>
            <Label>Shablon tanlang</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTpl(t.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    tpl === t.key
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Yaratish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
