"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Handshake, ExternalLink } from "lucide-react";
import { Button, Card, Input, Label, Switch } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { ImageUpload } from "@/components/dashboard/image-upload";

type Partner = {
  id: string;
  name: string;
  image: string;
  url: string | null;
  isActive: boolean;
};

export function PartnersManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/partners");
    const json = await res.json();
    if (json.success) setPartners(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openModal() {
    setName("");
    setUrl("");
    setImage("");
    setError("");
    setModal(true);
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image) {
      setError("Hamkor logosini yuklang");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image, url }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    setModal(false);
    load();
  }

  async function toggle(p: Partner) {
    await fetch(`/api/admin/partners/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hamkor o'chirilsinmi?")) return;
    await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" /> Hamkor qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : partners.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Handshake className="h-10 w-10 text-muted/40" />
          <p className="mt-3 font-medium text-foreground">Hamkor yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Bosh sahifada ko'rsatish uchun hamkor logolarini qo'shing
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="h-24 w-40 overflow-hidden rounded-xl border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="text-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 truncate font-medium text-foreground">{p.name}</p>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 flex items-center gap-1 truncate text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{p.url}</span>
                </a>
              )}
              <div className="mt-3 border-t border-border pt-3">
                <Switch
                  checked={p.isActive}
                  onChange={() => toggle(p)}
                  label={p.isActive ? "Ko'rinadi" : "Yashirin"}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Yangi hamkor">
        <form onSubmit={create} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div>
            <Label>Logo / rasm</Label>
            <ImageUpload value={image} onChange={setImage} aspect="wide" />
            <p className="mt-1.5 text-xs text-muted">
              Shaffof fonli (PNG) logo eng chiroyli chiqadi
            </p>
          </div>
          <div>
            <Label>Hamkor nomi</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Uzum Market"
              required
            />
          </div>
          <div>
            <Label>Havola (ixtiyoriy)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
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
