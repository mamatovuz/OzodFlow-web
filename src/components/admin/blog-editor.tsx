"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Star } from "lucide-react";
import { Button, Card, Input, Textarea, Label, Switch } from "@/components/ui";
import { ImageUpload, MultiImageUpload } from "@/components/dashboard/image-upload";
import { slugify } from "@/lib/utils";

function todayInput(d?: string) {
  const date = d ? new Date(d) : new Date();
  return date.toISOString().slice(0, 10);
}

export function BlogEditor({ postId }: { postId: string }) {
  const router = useRouter();
  const isNew = postId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [version, setVersion] = useState("");
  const [publishDate, setPublishDate] = useState(todayInput());
  const [coverImage, setCoverImage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/blog/${postId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const p = j.data;
          setTitle(p.title);
          setSlug(p.slug);
          setSlugTouched(true);
          setDescription(p.description);
          setBody(p.body || "");
          setVersion(p.version || "");
          setPublishDate(todayInput(p.publishDate));
          setCoverImage(p.coverImage || "");
          try {
            setImages(JSON.parse(p.images || "[]"));
          } catch {
            setImages([]);
          }
          setIsPublished(p.isPublished);
          setIsFeatured(p.isFeatured);
        } else {
          setError("Blog topilmadi");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Yuklashda xatolik");
        setLoading(false);
      });
  }, [postId, isNew]);

  // Sarlavhadan avtomatik slug (agar qo'lda o'zgartirilmagan bo'lsa)
  useEffect(() => {
    if (isNew && !slugTouched) setSlug(slugify(title));
  }, [title, slugTouched, isNew]);

  async function save() {
    setError("");
    if (!title.trim()) return setError("Sarlavha kiriting");
    if (!description.trim()) return setError("Qisqa tavsif kiriting");

    setSaving(true);
    const payload = {
      title,
      slug: slug || undefined,
      description,
      body,
      coverImage: coverImage || images[0] || "",
      images,
      version,
      publishDate: new Date(publishDate).toISOString(),
      isPublished,
      isFeatured,
    };
    const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${postId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Saqlashda xatolik");
      return;
    }
    router.push("/admins/blog");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admins/blog"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? "Yangi blog" : "Blogni tahrirlash"}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-4 p-4">
            <div>
              <Label>Sarlavha *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Yangi menyu dizaynlari qo'shildi"
              />
            </div>
            <div>
              <Label>Havola (slug)</Label>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-2 text-sm text-muted">
                  ozodflow.uz/blog/
                </span>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="yangi-menyu-dizaynlari"
                />
              </div>
            </div>
            <div>
              <Label>Qisqa tavsif *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ro'yxatda va kartada ko'rinadigan qisqa matn"
              />
            </div>
            <div>
              <Label>To'liq matn (ixtiyoriy)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="Blog to'liq matni..."
              />
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div>
              <Label>Muqova rasmi</Label>
              <ImageUpload value={coverImage} onChange={setCoverImage} aspect="wide" />
              <p className="mt-1.5 text-xs text-muted">
                Ro'yxat va bosh sahifada asosiy rasm sifatida chiqadi
              </p>
            </div>
            <div>
              <Label>Qo'shimcha rasmlar ({images.length}/10)</Label>
              <MultiImageUpload images={images} onChange={setImages} max={10} />
              <p className="mt-1.5 text-xs text-muted">1 tadan 10 tagacha rasm qo'shishingiz mumkin</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div>
              <Label>Versiya (ixtiyoriy)</Label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.2"
              />
            </div>
            <div>
              <Label>Sana</Label>
              <Input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>
            <div className="border-t border-border pt-3">
              <Switch checked={isPublished} onChange={setIsPublished} label="Chop etilgan" />
              <p className="mt-1 text-xs text-muted">O'chirilsa — faqat qoralama, saytda ko'rinmaydi</p>
            </div>
            <div className="border-t border-border pt-3">
              <Switch
                checked={isFeatured}
                onChange={setIsFeatured}
                label="Bosh sahifada ko'rsatish"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Star className="h-3 w-3 text-warning" /> Yulduzcha — bosh sahifada (maks 5 ta)
              </p>
            </div>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? "Joylash" : "Saqlash"}
          </Button>
        </div>
      </div>
    </div>
  );
}
