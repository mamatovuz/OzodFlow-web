"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Loader2,
  Newspaper,
  Star,
  Eye,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";

type Post = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  version: string | null;
  publishDate: string;
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
};

const MAX_FEATURED = 5;

export function BlogManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/blog");
    const json = await res.json();
    if (json.success) setPosts(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const featuredCount = posts.filter((p) => p.isFeatured).length;

  async function toggleFeatured(p: Post) {
    setError("");
    if (!p.isFeatured && featuredCount >= MAX_FEATURED) {
      setError(`Bosh sahifada ko'pi bilan ${MAX_FEATURED} ta blog bo'lishi mumkin`);
      return;
    }
    setBusy(p.id);
    const res = await fetch(`/api/admin/blog/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !p.isFeatured }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    load();
  }

  async function togglePublish(p: Post) {
    setBusy(p.id);
    await fetch(`/api/admin/blog/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    });
    setBusy(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Blog o'chirilsinmi?")) return;
    setBusy(id);
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    setBusy(null);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Yulduzchali bloglar bosh sahifada chiqadi ({featuredCount}/{MAX_FEATURED})
        </p>
        <Link href="/admins/blog/new">
          <Button>
            <Plus className="h-4 w-4" /> Yangi blog
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Newspaper className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Hali blog yo'q</p>
          <p className="mt-1 text-sm text-muted">Birinchi blogingizni yozing</p>
          <Link href="/admins/blog/new" className="mt-4">
            <Button>
              <Plus className="h-4 w-4" /> Yangi blog
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 sm:w-32">
                {p.coverImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted/40">
                    <Newspaper className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-foreground">{p.title}</h3>
                  {p.version && <Badge variant="default">{p.version}</Badge>}
                  {p.isPublished ? (
                    <Badge variant="success">Chop etilgan</Badge>
                  ) : (
                    <Badge variant="warning">Qoralama</Badge>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span>/blog/{p.slug}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {p.views}
                  </span>
                  <span>{new Date(p.publishDate).toLocaleDateString("uz")}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                <div className="flex items-center gap-1">
                  <button
                    title={p.isFeatured ? "Bosh sahifadan olib tashlash" : "Bosh sahifaga chiqarish"}
                    onClick={() => toggleFeatured(p)}
                    disabled={busy === p.id}
                    className={
                      p.isFeatured
                        ? "flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning"
                        : "flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-warning"
                    }
                  >
                    <Star className={`h-4 w-4 ${p.isFeatured ? "fill-current" : ""}`} />
                  </button>
                  <Link
                    href={`/admins/blog/${p.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={busy === p.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => togglePublish(p)}
                  disabled={busy === p.id}
                  className="text-xs text-accent hover:underline"
                >
                  {p.isPublished ? "Qoralamaga o'tkazish" : "Chop etish"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
