"use client";

import { useState } from "react";
import { CreditCard, Loader2, Check, Percent } from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";

// Restoran to'lov kartasi — ofitsant "Karta" to'lovini tanlaganda shu raqam+ism chiqadi.
export function PaymentCardSettings({
  number,
  holder,
  serviceRate,
}: {
  number: string | null;
  holder: string | null;
  serviceRate?: number;
}) {
  const [cardNumber, setCardNumber] = useState(number || "");
  const [cardHolder, setCardHolder] = useState(holder || "");
  const [svcRate, setSvcRate] = useState(String(serviceRate ?? 0));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const rate = Math.min(100, Math.max(0, Number(svcRate.replace(/\D/g, "")) || 0));
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardNumber.trim() || null, cardHolder: cardHolder.trim() || null, serviceRate: rate }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  // Raqamni 4 xonadan guruhlab ko'rsatish
  function formatCard(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">To'lov kartasi</h2>
          <p className="text-xs text-muted">Ofitsant &quot;Karta&quot; to'lovini tanlaganda shu raqam ko'rsatiladi</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Karta raqami</Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCard(e.target.value))}
            placeholder="8600 1234 5678 9012"
            inputMode="numeric"
            className="font-mono tracking-wider"
          />
        </div>
        <div>
          <Label>Karta egasi (ism familiya)</Label>
          <Input
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            placeholder="ALIYEV KAMRON"
          />
        </div>
      </div>

      {/* Xizmat haqi (servis) foizi */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/50 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Percent className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Standart xizmat haqi</p>
            <p className="text-xs text-muted">To'lov oynasida shu foiz avtomatik taklif qilinadi (0 = o'chiq)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            value={svcRate}
            onChange={(e) => setSvcRate(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            className="w-16 text-center font-semibold"
          />
          <span className="text-sm font-medium text-muted">%</span>
        </div>
      </div>

      {/* Jonli ko'rinish */}
      {cardNumber && (
        <div className="mt-4 max-w-xs rounded-2xl bg-gradient-to-br from-accent to-accent-hover p-4 text-white shadow-md">
          <CreditCard className="h-6 w-6 opacity-80" />
          <p className="mt-4 font-mono text-lg tracking-widest">{cardNumber || "•••• •••• •••• ••••"}</p>
          <p className="mt-1 text-sm uppercase tracking-wide opacity-90">{cardHolder || "KARTA EGASI"}</p>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Saqlandi" : "Saqlash"}
        </Button>
      </div>
    </Card>
  );
}
