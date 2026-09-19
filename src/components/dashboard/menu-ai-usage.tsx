"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Lock, CheckCircle2 } from "lucide-react";
import { Card, Button } from "@/components/ui";

type Status = {
  paidActive: boolean;
  locked: boolean;
  used: number;
  quota: number;
  remaining: number;
  paidUntil: string | null;
  priceSom: number;
  priceUsd: number;
};

function fmtSom(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

// Menyu AI — bepul kvota holati + tugagach inPAY orqali oylik obuna sotib olish.
export function MenuAiUsageCard() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/restaurant/menu-ai")
      .then((r) => r.json())
      .then((j) => j?.data && setSt(j.data))
      .catch(() => {});
  }, []);

  async function buy() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/payment/menu-ai", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.data?.payUrl) {
      setBusy(false);
      setErr(j?.error || "To'lov boshlanmadi");
      return;
    }
    window.location.href = j.data.payUrl; // inPAY to'lov sahifasi
  }

  if (!st) return null;

  const pct = Math.min(100, Math.round((st.used / Math.max(1, st.quota)) * 100));
  const paidUntil = st.paidUntil ? new Date(st.paidUntil).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" }) : null;

  // Pullik obuna faol
  if (st.paidActive) {
    return (
      <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> AI menyu obunasi faol
        </div>
        {paidUntil && <p className="mt-1 text-sm text-muted">Amal qiladi: <b>{paidUntil}</b> gача. Cheksiz so'rovlar.</p>}
      </Card>
    );
  }

  // Limit tugagan — to'lov CTA
  if (st.locked) {
    return (
      <Card className="mb-4 border-amber-500/40 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-400">
          <Lock className="h-5 w-5" /> Bepul limitingiz tugadi
        </div>
        <p className="mt-1.5 text-sm text-muted">
          AI menyu yordamchisi bepul {st.quota} ta so'rovni ishlatib bo'ldi. Davom ettirish uchun oylik
          obuna sotib oling — <b>1 oy cheksiz</b> so'rovlar.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-lg font-bold">
            {fmtSom(st.priceSom)} <span className="text-sm font-normal text-muted">/ oy (≈ ${st.priceUsd})</span>
          </div>
          <Button onClick={buy} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            inPAY bilan to'lash
          </Button>
        </div>
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      </Card>
    );
  }

  // Bepul kvota — progress
  return (
    <Card className="mb-4 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium"><Sparkles className="h-4 w-4 text-accent" /> Bepul AI so'rovlar</span>
        <span className="text-muted">{st.used} / {st.quota}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-amber-500" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {st.remaining} ta bepul so'rov qoldi. Tugagach oyiga {fmtSom(st.priceSom)} (≈ ${st.priceUsd}) — 1 oy cheksiz.
      </p>
    </Card>
  );
}
