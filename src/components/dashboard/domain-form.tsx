"use client";

import { useState } from "react";
import { Loader2, Check, Globe, Lock, ExternalLink } from "lucide-react";
import { Button, Input, Card, Badge } from "@/components/ui";
import Link from "next/link";

export function DomainForm({
  current,
  slug,
  canCustomDomain,
}: {
  current: string | null;
  slug: string;
  canCustomDomain: boolean;
}) {
  const [domain, setDomain] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(remove = false) {
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customDomain: remove ? "" : domain.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    if (remove) setDomain("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!canCustomDomain) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted" />
          <h2 className="font-semibold text-foreground">O'z domeningiz</h2>
          <Badge variant="warning">Pro</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          O'z domeningizni (masalan <b>menu.restoran.uz</b>) ulash Pro yoki Pro
          Max tarifida mavjud.
        </p>
        <Link href="/dashboard/settings" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <Lock className="h-4 w-4" /> Tarifni yangilash
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent" />
        <h2 className="font-semibold text-foreground">O'z domeningiz</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Hozirgi manzil: <span className="text-foreground">/m/{slug}</span>. O'z
        domeningizni ulang.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="menu.restoran.uz"
        />
        <Button onClick={() => save(false)} disabled={saving || !domain.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Saqlash
        </Button>
        {current && (
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            O'chirish
          </Button>
        )}
      </div>

      {saved && (
        <p className="mt-2 flex items-center gap-1 text-sm text-success">
          <Check className="h-4 w-4" /> Saqlandi
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {current && (
        <a
          href={`http://${current}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {current}
        </a>
      )}

      {/* DNS ko'rsatma */}
      <div className="mt-5 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-foreground">
          Domenni ulash bo'yicha ko'rsatma
        </p>
        <ol className="mt-2 space-y-1 text-sm text-muted">
          <li>1. Domeningiz DNS sozlamalarida <b>CNAME</b> yozuv qo'shing.</li>
          <li>
            2. Qiymat sifatida platforma manzilini ko'rsating (masalan{" "}
            <span className="font-mono text-foreground">cname.ozodflow.uz</span>).
          </li>
          <li>3. Bu yerga domeningizni kiriting va saqlang.</li>
          <li>4. DNS tarqalgach (bir necha soat) domeningiz ishlaydi.</li>
        </ol>
      </div>
    </Card>
  );
}
