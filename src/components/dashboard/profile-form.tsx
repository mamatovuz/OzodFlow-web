"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button, Input, Textarea, Label, Select, Card, Switch } from "@/components/ui";
import { ImageUpload } from "@/components/dashboard/image-upload";

type Restaurant = {
  name: string;
  description: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  logo: string | null;
  cover: string | null;
  phone: string | null;
  telegram: string | null;
  instagram: string | null;
  website: string | null;
  mapUrl: string | null;
  address: string | null;
  workHours: string | null;
  currency: string;
  hasDelivery: boolean;
  primaryColor: string;
};

export function ProfileForm({ initial }: { initial: Restaurant }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(initial.hasDelivery);
  const [color, setColor] = useState(initial.primaryColor || "#2563EB");
  const [logo, setLogo] = useState(initial.logo || "");
  const [cover, setCover] = useState(initial.cover || "");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      description: f.get("description"),
      descriptionRu: f.get("descriptionRu"),
      descriptionEn: f.get("descriptionEn"),
      logo,
      cover,
      phone: f.get("phone"),
      telegram: f.get("telegram"),
      instagram: f.get("instagram"),
      website: f.get("website"),
      mapUrl: f.get("mapUrl"),
      address: f.get("address"),
      workHours: f.get("workHours"),
      currency: f.get("currency"),
      hasDelivery,
      primaryColor: color,
    };
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Asosiy */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Asosiy ma'lumot</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Restoran nomi *</Label>
            <Input name="name" defaultValue={initial.name} required />
          </div>
          <div className="sm:col-span-2">
            <Label>Qisqacha tavsif (o'zbekcha)</Label>
            <Textarea
              name="description"
              defaultValue={initial.description ?? ""}
              rows={2}
              placeholder="Milliy taomlar restorani..."
            />
          </div>
          <div>
            <Label>Описание (RU)</Label>
            <Textarea name="descriptionRu" defaultValue={initial.descriptionRu ?? ""} rows={2} />
          </div>
          <div>
            <Label>Description (EN)</Label>
            <Textarea name="descriptionEn" defaultValue={initial.descriptionEn ?? ""} rows={2} />
          </div>
          <div>
            <Label>Logo</Label>
            <ImageUpload value={logo} onChange={setLogo} aspect="square" label="logo" />
          </div>
          <div>
            <Label>Cover rasm</Label>
            <ImageUpload value={cover} onChange={setCover} aspect="wide" label="cover" />
          </div>
          <div>
            <Label>Valyuta</Label>
            <Select name="currency" defaultValue={initial.currency}>
              <option value="UZS">UZS (so'm)</option>
              <option value="USD">USD ($)</option>
              <option value="RUB">RUB (₽)</option>
              <option value="EUR">EUR (€)</option>
            </Select>
          </div>
          <div>
            <Label>Brend rangi</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Aloqa */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-foreground">Aloqa va manzil</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Telefon</Label>
            <Input name="phone" defaultValue={initial.phone ?? ""} placeholder="+998..." />
          </div>
          <div>
            <Label>Telegram</Label>
            <Input name="telegram" defaultValue={initial.telegram ?? ""} placeholder="@username" />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={initial.instagram ?? ""} placeholder="@username" />
          </div>
          <div>
            <Label>Website</Label>
            <Input name="website" defaultValue={initial.website ?? ""} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Manzil</Label>
            <Input name="address" defaultValue={initial.address ?? ""} placeholder="Toshkent sh, ..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Google Maps havolasi</Label>
            <Input name="mapUrl" defaultValue={initial.mapUrl ?? ""} placeholder="https://maps.google.com/..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Ish vaqti</Label>
            <Input name="workHours" defaultValue={initial.workHours ?? ""} placeholder="Har kuni 09:00 - 23:00" />
          </div>
        </div>
        <div className="mt-4">
          <Switch
            checked={hasDelivery}
            onChange={setHasDelivery}
            label="Yetkazib berish mavjud"
          />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saqlandi
          </span>
        )}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          O'zgarishlarni saqlash
        </Button>
      </div>
    </form>
  );
}
