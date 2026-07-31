"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export function SlugEditor({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const changed = value.trim() !== current;

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/restaurant/slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: value }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setValue(json.data.slug);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
        <Link2 className="h-3.5 w-3.5" />
        Menyu manzili
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-border bg-card focus-within:border-accent">
          <span className="select-none whitespace-nowrap bg-surface-2 px-3 py-2 text-sm text-muted">
            ozodflow.uz/m/
          </span>
          <input
            value={value}
            onChange={(e) => {
              setValue(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              );
              setError("");
              setSaved(false);
            }}
            className="h-10 flex-1 bg-transparent px-2 text-sm text-foreground outline-none"
            placeholder="restoran-nomi"
          />
        </div>
        <Button onClick={save} disabled={saving || !changed || !value.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Saqlash
        </Button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-error">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {saved && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-success">
          <Check className="h-4 w-4" /> Manzil yangilandi
        </p>
      )}
      <p className="mt-1.5 text-xs text-muted">
        Yangi manzil kiritib "Saqlash" bosing. Band bo'lsa boshqasini tanlashingiz
        so'raladi. Eski QR kodlar ishlamay qolishi mumkin.
      </p>
    </div>
  );
}
