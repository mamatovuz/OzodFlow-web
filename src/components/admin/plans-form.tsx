"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Crown } from "lucide-react";
import { Button, Input, Card, Label } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

export function PlansForm() {
  const [prices, setPrices] = useState<Record<string, number>>({
    STARTER: 0,
    PRO: 0,
    BUSINESS: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/plans");
    const json = await res.json();
    if (json.success) setPrices(json.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(plan: string, price: number) {
    setSaving(plan);
    setSaved(null);
    const res = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, price }),
    });
    const json = await res.json();
    setSaving(null);
    if (res.ok) {
      setPrices(json.data);
      setSaved(plan);
      setTimeout(() => setSaved(null), 2500);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const rows: { key: string; name: string }[] = [
    { key: "STARTER", name: "Starter" },
    { key: "PRO", name: "Pro" },
    { key: "BUSINESS", name: "Business" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.key} className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" />
            <h2 className="font-semibold text-foreground">{r.name}</h2>
          </div>
          <Label>Oylik narx (so'm)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={prices[r.key]}
              onChange={(e) =>
                setPrices((p) => ({ ...p, [r.key]: Number(e.target.value) }))
              }
            />
            <Button onClick={() => save(r.key, prices[r.key])} disabled={saving === r.key}>
              {saving === r.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved === r.key ? (
                <Check className="h-4 w-4" />
              ) : (
                "Saqlash"
              )}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Hozirgi: {formatPrice(prices[r.key], "UZS")} / oy
          </p>
        </Card>
      ))}
    </div>
  );
}
