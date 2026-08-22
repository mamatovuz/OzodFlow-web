"use client";

import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { Card } from "@/components/ui";

export function PhoneRequestToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setSaving(true);
    setOn(next); // optimistik
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ askPhone: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setOn(!next); // qaytarish
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Phone className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium text-foreground">Telefon raqam so'rash</p>
            <p className="mt-0.5 text-sm text-muted">
              Yoqilsa, mijoz buyurtma rasmiylashtirayotganda telefon raqamini
              kiritishi mumkin (ixtiyoriy). O'chirsangiz, buyurtma oynasida
              telefon raqam so'rash umuman ko'rinmaydi.
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={on}
          onClick={() => !saving && toggle(!on)}
          disabled={saving}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            on ? "bg-accent" : "bg-surface-2"
          }`}
        >
          {saving ? (
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                on ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          )}
        </button>
      </div>
    </Card>
  );
}
