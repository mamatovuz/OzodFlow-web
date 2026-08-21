"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Crown } from "lucide-react";
import { Button, Input, Card, Label } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

const LIFETIME_MONTHS = 36; // lib/plans.ts bilan mos

export function PlansForm() {
  const [prices, setPrices] = useState<Record<string, number>>({ STARTER: 0, BUSINESS: 0 });
  const [lifetime, setLifetime] = useState<Record<string, number>>({ STARTER: 0, BUSINESS: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/plans");
    const json = await res.json();
    if (json.success) {
      const { lifetime: lf, ...monthly } = json.data as Record<string, number> & {
        lifetime?: Record<string, number>;
      };
      setPrices(monthly);
      if (lf) setLifetime(lf);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(plan: string) {
    setSaving(plan);
    setSaved(null);
    const res = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        price: prices[plan],
        lifetimePrice: lifetime[plan] || 0,
      }),
    });
    const json = await res.json();
    setSaving(null);
    if (res.ok) {
      const { lifetime: lf, ...monthly } = json.data as Record<string, number> & {
        lifetime?: Record<string, number>;
      };
      setPrices(monthly);
      if (lf) setLifetime(lf);
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
    { key: "BUSINESS", name: "Business" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((r) => {
        const monthly = prices[r.key] || 0;
        const lp = lifetime[r.key] || 0;
        const autoLifetime = monthly * LIFETIME_MONTHS;
        const effective = lp > 0 ? lp : autoLifetime;
        // Chegirma foizi: umrbod narx oylik×36 ga nisbatan qancha arzon
        const discount = autoLifetime > 0 ? Math.round((1 - effective / autoLifetime) * 100) : 0;
        return (
          <Card key={r.key} className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              <h2 className="font-semibold text-foreground">{r.name}</h2>
            </div>

            <Label>Oylik narx (so'm)</Label>
            <Input
              type="number"
              value={monthly}
              onChange={(e) => setPrices((p) => ({ ...p, [r.key]: Number(e.target.value) }))}
            />

            <Label className="mt-4">Umrbod narx (so'm)</Label>
            <Input
              type="number"
              value={lp}
              placeholder={`Bo'sh = avtomatik (${formatPrice(autoLifetime, "UZS")})`}
              onChange={(e) => setLifetime((p) => ({ ...p, [r.key]: Number(e.target.value) }))}
            />
            <p className="mt-1.5 text-xs text-muted">
              Umrbod narx: <b className="text-foreground">{formatPrice(effective, "UZS")}</b>
              {discount > 0 && (
                <span className="ml-1 rounded bg-success/10 px-1.5 py-0.5 font-medium text-success">
                  −{discount}% chegirma
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Bo'sh (0) qoldirsangiz — oylik narx × {LIFETIME_MONTHS} avtomatik hisoblanadi.
            </p>

            <Button
              className="mt-4 w-full"
              onClick={() => save(r.key)}
              disabled={saving === r.key}
            >
              {saving === r.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved === r.key ? (
                <>
                  <Check className="h-4 w-4" /> Saqlandi
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
