"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, ImageIcon } from "lucide-react";
import { Button, Input, Label, Card, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { ImageUpload } from "@/components/dashboard/image-upload";

type Banner = {
  id: string;
  image: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  isActive: boolean;
};

export function BannersManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/banners");
    const json = await res.json();
    if (json.success) setBanners(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        title: f.get("title"),
        subtitle: f.get("subtitle"),
        linkUrl: f.get("linkUrl"),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    setModal(false);
    setImage("");
    load();
  }

  async function toggle(b: Banner) {
    await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Banner o'chirilsinmi?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Banner qo'shish
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <ImageIcon className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Banner yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Menyu tepasida chiqadigan reklama bannerlarini qo'shing
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="relative h-32 bg-surface-2">
                {b.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/50 to-transparent p-4 text-white">
                  {b.title && <p className="font-bold">{b.title}</p>}
                  {b.subtitle && <p className="text-sm text-white/80">{b.subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between p-3">
                <Switch checked={b.isActive} onChange={() => toggle(b)} label={b.isActive ? "Faol" : "Nofaol"} />
                <button onClick={() => remove(b.id)} className="text-muted hover:text-error">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi banner">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
          )}
          <div>
            <Label>Banner rasmi</Label>
            <ImageUpload value={image} onChange={setImage} aspect="wide" label="banner" />
          </div>
          <div>
            <Label>Sarlavha</Label>
            <Input name="title" placeholder="Kaboblar haftasi" />
          </div>
          <div>
            <Label>Tavsif</Label>
            <Input name="subtitle" placeholder="20% chegirma" />
          </div>
          <div>
            <Label>Havola (ixtiyoriy)</Label>
            <Input name="linkUrl" placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
