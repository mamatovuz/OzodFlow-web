"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button, Input, Label, Card } from "@/components/ui";

export function AccountForm({
  initial,
}: {
  initial: { name: string; email: string };
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setSaved(true);
    (e.target as HTMLFormElement).password.value = "";
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}
        <div>
          <Label>Ism</Label>
          <Input name="name" defaultValue={initial.name} required />
        </div>
        <div>
          <Label>Email (login)</Label>
          <Input name="email" type="email" defaultValue={initial.email} required />
        </div>
        <div>
          <Label>Yangi parol</Label>
          <Input
            name="password"
            type="password"
            placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
            minLength={6}
          />
          <p className="mt-1 text-xs text-muted">
            Faqat parolni o'zgartirmoqchi bo'lsangiz to'ldiring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-success">
              <Check className="h-4 w-4" /> Saqlandi
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
