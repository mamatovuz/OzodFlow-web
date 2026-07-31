"use client";

import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Ticket, Gift } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";

type Promo = {
  id: string;
  code: string;
  discountPercent: number;
  usedCount: number;
  maxUses: number | null;
  createdAt: string;
};

export function MyPromo() {
  const [codes, setCodes] = useState<Promo[]>([]);
  const [canClaim, setCanClaim] = useState(false);
  const [discount, setDiscount] = useState(3);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/promo/my");
    const json = await res.json();
    if (json.success) {
      setCodes(json.data.codes);
      setCanClaim(json.data.canClaim);
      setDiscount(json.data.discountPercent);
      setNextDate(json.data.nextDate);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function claim() {
    setClaiming(true);
    setError("");
    const res = await fetch("/api/promo/my", { method: "POST" });
    const json = await res.json();
    setClaiming(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    load();
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Gift className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Yillik promo kod</h2>
            <p className="mt-1 text-sm text-muted">
              Har yili 1 marta Pro yoki Pro Max uchun <b>{discount}%</b> chegirma
              kodini olishingiz mumkin. To'lov paytida shu kodni kiriting.
            </p>
            {canClaim ? (
              <Button className="mt-4" onClick={claim} disabled={claiming}>
                {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
                <Ticket className="h-4 w-4" /> Promo kod olish
              </Button>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Bu yil uchun kodni olgansiz.
                {nextDate && (
                  <> Keyingi: {new Date(nextDate).toLocaleDateString("uz-UZ")}</>
                )}
              </p>
            )}
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
          </div>
        </div>
      </Card>

      {codes.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-foreground">Mening kodlarim</h3>
          <div className="space-y-2">
            {codes.map((p) => {
              const used = p.maxUses !== null && p.usedCount >= p.maxUses;
              return (
                <Card key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">{p.code}</p>
                    <p className="text-xs text-muted">
                      {p.discountPercent}% chegirma ·{" "}
                      {used ? "ishlatilgan" : "faol"} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  {used ? (
                    <Badge variant="default">Ishlatilgan</Badge>
                  ) : (
                    <button onClick={() => copy(p.code)} className="flex items-center gap-1 text-sm text-accent">
                      {copied === p.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Nusxalash
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
