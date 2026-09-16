"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Store, Check, Sparkles, ArrowRight, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui";

type PlanId = "FREE" | "STARTER" | "BUSINESS";

const money = (n: number) => n.toLocaleString("uz-UZ").replace(/,/g, " ");

export function OnboardingWizard({
  initialName,
  prices,
  inpayEnabled,
  trialDays,
}: {
  initialName: string;
  prices: { STARTER: number; BUSINESS: number };
  inpayEnabled: boolean;
  trialDays: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initialName);
  const [plan, setPlan] = useState<PlanId>("FREE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans: {
    id: PlanId;
    name: string;
    price: string;
    tag?: string;
    features: string[];
    highlight?: boolean;
  }[] = [
    {
      id: "FREE",
      name: "Sinov",
      price: `${trialDays} kun bepul`,
      features: ["20 tagacha mahsulot", "QR menyu va buyurtma", "Dashboard statistikasi", "Dizayn tanlash"],
    },
    {
      id: "STARTER",
      name: "Starter",
      price: `${money(prices.STARTER)} so'm / oy`,
      features: ["Cheksiz mahsulot", "Telegram kanaliga buyurtma", "30 tagacha stol", "Barcha Sinov imkoniyatlari"],
    },
    {
      id: "BUSINESS",
      name: "Business",
      price: `${money(prices.BUSINESS)} so'm / oy`,
      tag: "Ommabop",
      highlight: true,
      features: [
        "Oshxona + ofitsant paneli",
        "Kassa (POS) integratsiyasi",
        "Premium dizaynlar + maxsus domen",
        "Filiallar va batafsil hisobot",
      ],
    },
  ];

  function next() {
    if (name.trim().length < 2) {
      setError("Restoran/kafe nomini kiriting (kamida 2 belgi)");
      return;
    }
    setError("");
    setStep(2);
  }

  async function finish() {
    setLoading(true);
    setError("");
    // 1) Restoran nomini saqlaymiz, onboarding tugadi
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "Xatolik yuz berdi");
      setLoading(false);
      return;
    }

    // 2) Pullik tarif tanlansa — inPay to'loviga o'tamiz (30 kun trial baribir faol)
    if (plan !== "FREE" && inpayEnabled) {
      const pay = await fetch("/api/payment/inpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, months: 1 }),
      });
      const pj = await pay.json();
      if (pay.ok && pj.success && pj.data?.payUrl) {
        window.location.href = pj.data.payUrl;
        return;
      }
      // To'lov yaratilmasa — trial bilan davom etamiz (keyin billing'dan to'laydi)
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      {/* Bosqich ko'rsatkichi */}
      <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium text-muted">
        <span className={step >= 1 ? "text-accent" : ""}>1. Restoran nomi</span>
        <span className="h-px w-6 bg-border" />
        <span className={step >= 2 ? "text-accent" : ""}>2. Tarif</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {step === 1 && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Restoraningiz nomi</h1>
          <p className="mt-1.5 text-sm text-muted">
            Bu nom menyu va mijozlarga ko'rinadigan sahifada chiqadi. Keyinroq
            sozlamalardan o'zgartirishingiz mumkin.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && next()}
            placeholder="Masalan: Osh Markazi"
            autoFocus
            className="mt-5 h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground outline-none focus:border-accent"
          />
          <Button onClick={next} className="mt-5 w-full">
            Keyingi <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">Tarifni tanlang</h1>
            <p className="mt-1.5 text-sm text-muted">
              {trialDays} kun bepul boshlang — keyin xohlagan tarifga o'tasiz.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const active = plan === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`relative flex flex-col rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-accent bg-accent-soft/50 ring-2 ring-accent"
                      : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  {p.tag && (
                    <span className="absolute -top-2 right-3 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Crown className="h-3 w-3" /> {p.tag}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        active ? "border-accent bg-accent text-white" : "border-border"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-accent">{p.price}</div>
                  <ul className="mt-3 space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {plan !== "FREE" && !inpayEnabled && (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
              Onlayn to'lov hozircha ulanmagan — {trialDays} kunlik bepul sinov bilan
              boshlaysiz, tarifni keyinroq to'lov bo'limidan faollashtirasiz.
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
              <ArrowLeft className="h-4 w-4" /> Ortga
            </Button>
            <Button onClick={finish} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : plan !== "FREE" && inpayEnabled ? (
                <>
                  To'lovga o'tish <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Boshlash
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
