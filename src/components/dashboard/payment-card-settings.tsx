"use client";

import { useState } from "react";
import { CreditCard, Loader2, Check } from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";

// Restoran to'lov kartasi — ofitsant "Karta" to'lovini tanlaganda shu raqam+ism chiqadi.
export function PaymentCardSettings({
  number,
  holder,
}: {
  number: string | null;
  holder: string | null;
}) {
  const [cardNumber, setCardNumber] = useState(number || "");
  const [cardHolder, setCardHolder] = useState(holder || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardNumber.trim() || null, cardHolder: cardHolder.trim() || null }),
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
