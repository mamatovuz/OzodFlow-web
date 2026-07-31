"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Images } from "lucide-react";
import { Button, Input, Label, Card, Select } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { ImageUpload } from "@/components/dashboard/image-upload";

type Img = {
  id: string;
  image: string;
  caption: string | null;
  category: string;
};

const CATS: Record<string, string> = {
  interior: "Interyer",
  exterior: "Eksteryer",
  team: "Jamoa",
  other: "Boshqa",
};

export function GalleryManager() {
  const [items, setItems] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/gallery");
    const json = await res.json();
    if (json.success) setItems(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image) {
      setError("Rasm yuklang");
      return;
    }
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        caption: f.get("caption"),
        category: f.get("category"),
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

  async function remove(id: string) {
    if (!confirm("Rasm o'chirilsinmi?")) return;
    await fetch(`/api/gallery/${id}`, { method: "DELETE" });
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
          <Plus className="h-4 w-4" /> Rasm qo'shish
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Images className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Galereya bo'sh</p>
          <p className="mt-1 text-sm text-muted">
            Restoran interyeri, jamoa va boshqa rasmlarni yuklang
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.id} className="group relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {CATS[it.category] || it.category}
                </span>
                {it.caption && <p className="mt-1 truncate text-xs text-white">{it.caption}</p>}
              </div>
              <button
                onClick={() => remove(it.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi rasm">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}
          <div>
            <Label>Rasm</Label>
            <ImageUpload value={image} onChange={setImage} aspect="wide" label="galereya" />
          </div>
          <div>
            <Label>Bo'lim</Label>
            <Select name="category" defaultValue="interior">
              {Object.entries(CATS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input name="caption" placeholder="Masalan: Asosiy zal" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Bekor</Button>
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
