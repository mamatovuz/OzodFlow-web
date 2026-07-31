"use client";

import { useEffect, useState } from "react";
import {
  Check,
  X,
  Crown,
  Loader2,
  Copy,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button, Card, Badge, Label } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";
import { PLANS, FEATURE_MATRIX, DURATIONS, computePrice, type PlanKey } from "@/lib/plans";

type PaymentRequest = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  adminNote: string | null;
  createdAt: string;
  receiptImage: string;
};

type PayCard = {
  id: string;
  bankName: string;
  cardNumber: string;
  cardHolder: string;
};

const order: PlanKey[] = ["FREE", "PRO", "PROMAX"];
const matrixKey = { FREE: "free", PRO: "pro", PROMAX: "promax" } as const;

export function Billing({
  currentPlan,
  daysLeft,
  expired,
}: {
  currentPlan: PlanKey;
  daysLeft: number | null;
  expired: boolean;
}) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({
    FREE: 0,
    PRO: PLANS.PRO.defaultPrice,
    PROMAX: PLANS.PROMAX.defaultPrice,
  });
  const [modal, setModal] = useState<PlanKey | null>(null);

  async function loadRequests() {
    const res = await fetch("/api/payment/request");
    const json = await res.json();
    if (json.success) setRequests(json.data);
  }
  async function loadPrices() {
    const res = await fetch("/api/payment/plans");
    const json = await res.json();
    if (json.success) setPrices(json.data);
  }

  useEffect(() => {
    loadRequests();
    loadPrices();
  }, []);

  const pending = requests.find((r) => r.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Joriy holat */}
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-warning" />
          <h2 className="font-semibold text-foreground">Joriy tarif</h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold text-foreground">
            {PLANS[currentPlan].name}
          </span>
          {daysLeft !== null && (
            <Badge variant={expired ? "error" : daysLeft <= 3 ? "warning" : "accent"}>
              {expired ? "Muddati tugagan" : `${daysLeft} kun qoldi`}
            </Badge>
          )}
        </div>
        {(currentPlan === "FREE" || expired) && (
          <p className="mt-2 text-sm text-muted">
            Pullik tariflar oylik. Muddat tugagach mahsulotlar 20 tagacha
            cheklanadi.
          </p>
        )}
      </Card>

      {/* Kutilayotgan so'rov */}
      {pending && (
        <Card className="border-warning/30 bg-warning/5 p-5">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="h-4 w-4" />
            <p className="text-sm font-medium">
              {PLANS[pending.plan as PlanKey].name} to'lovi tekshirilmoqda
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Chekingiz admin tomonidan ko'rib chiqilmoqda. Tez orada tasdiqlanadi.
          </p>
        </Card>
      )}

      {/* Tariflar — to'liq taqqoslash */}
      <div className="grid gap-4 lg:grid-cols-3">
        {order.map((key) => {
          const isCurrent = currentPlan === key && !expired;
          const mk = matrixKey[key];
          return (
            <Card
              key={key}
              className={`flex flex-col p-5 ${
                key === "PROMAX" ? "border-accent ring-1 ring-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{PLANS[key].name}</h3>
                {isCurrent ? (
                  <Badge variant="accent">Joriy</Badge>
                ) : key === "PROMAX" ? (
                  <Badge variant="accent">Top</Badge>
                ) : null}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {prices[key] === 0 ? "0" : formatPrice(prices[key], "UZS")}
                </span>
                {key !== "FREE" && <span className="text-xs text-muted">/ oy</span>}
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {FEATURE_MATRIX.map((f) => {
                  const val = f[mk];
                  const has = val !== false;
                  return (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {has ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted/40" />
                      )}
                      <span className={has ? "text-foreground" : "text-muted/50"}>
                        {f.label}
                        {typeof val === "string" && (
                          <span className="text-muted"> — {val}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {key !== "FREE" && !isCurrent && (
                <Button
                  className="mt-5 w-full"
                  variant={key === "PROMAX" ? "primary" : "outline"}
                  disabled={!!pending}
                  onClick={() => setModal(key)}
                >
                  {pending ? "So'rov kutilmoqda" : `${PLANS[key].name} sotib olish`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* To'lov tarixi */}
      {requests.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-foreground">To'lov tarixi</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {PLANS[r.plan as PlanKey].name} — {formatPrice(r.amount, "UZS")}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
                <StatusBadge status={r.status} note={r.adminNote} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {modal && (
        <PaymentModal
          plan={modal}
          price={prices[modal]}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            loadRequests();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status, note }: { status: string; note: string | null }) {
  if (status === "APPROVED")
    return (
      <span className="flex items-center gap-1 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Tasdiqlangan
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="flex items-center gap-1 text-sm text-error" title={note || ""}>
        <XCircle className="h-4 w-4" /> Rad etilgan
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-sm text-warning">
      <Clock className="h-4 w-4" /> Kutilmoqda
    </span>
  );
}

function PaymentModal({
  plan,
  price,
  onClose,
  onDone,
}: {
  plan: PlanKey;
  price: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [cards, setCards] = useState<PayCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [receipt, setReceipt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  // Muddat va promo
  const [durKey, setDurKey] = useState("1");
  const [customMonths, setCustomMonths] = useState(2);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState("");

  const dur = DURATIONS.find((d) => d.key === durKey)!;
  const lifetime = !!dur.lifetime;
  const months = dur.custom ? Math.max(1, customMonths) : dur.months;
  const baseAmount = computePrice(price, months, lifetime);
  const discount = promo ? Math.round((baseAmount * promo.discountPercent) / 100) : 0;
  const finalAmount = Math.max(0, baseAmount - discount);

  useEffect(() => {
    fetch("/api/payment/cards")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCards(j.data);
        setLoadingCards(false);
      });
  }, []);

  async function checkPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError("");
    const res = await fetch("/api/payment/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput, plan }),
    });
    const json = await res.json();
    setPromoChecking(false);
    if (!res.ok) {
      setPromo(null);
      setPromoError(json.error || "Kod noto'g'ri");
      return;
    }
    setPromo({ code: json.data.code, discountPercent: json.data.discountPercent });
  }

  async function uploadReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || "Yuklashda xatolik");
      return;
    }
    setReceipt(json.data.url);
  }

  async function submit() {
    if (!receipt) {
      setError("Iltimos, to'lov chekini yuklang");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/payment/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        months,
        lifetime,
        promoCode: promo?.code || undefined,
        receiptImage: receipt,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    onDone();
  }

  function copyCard(num: string) {
    navigator.clipboard.writeText(num.replace(/\s/g, ""));
    setCopied(num);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <Modal open onClose={onClose} title={`${PLANS[plan].name} — to'lov`}>
      <div className="space-y-5">
        {/* Muddat tanlash */}
        <div>
          <Label>Muddat</Label>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDurKey(d.key)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                  durKey === d.key
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-foreground hover:bg-surface-2"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {dur.custom && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted">Oylar soni:</span>
              <input
                type="number"
                min={1}
                max={60}
                value={customMonths}
                onChange={(e) => setCustomMonths(Number(e.target.value))}
                className="h-9 w-24 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        {/* Promo kod */}
        <div>
          <Label>Promo kod (ixtiyoriy)</Label>
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                setPromo(null);
                setPromoError("");
              }}
              placeholder="OZOD-XXXXXX"
              className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
            />
            <Button variant="outline" onClick={checkPromo} disabled={promoChecking || !promoInput.trim()}>
              {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tekshirish"}
            </Button>
          </div>
          {promo && (
            <p className="mt-1 flex items-center gap-1 text-sm text-success">
              <Check className="h-4 w-4" /> {promo.discountPercent}% chegirma qo'llandi
            </p>
          )}
          {promoError && <p className="mt-1 text-sm text-error">{promoError}</p>}
        </div>

        {/* Narx xulosasi */}
        <div className="rounded-xl bg-accent-soft p-4">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{lifetime ? "Umrbod" : `${months} oy`}</span>
            <span>{formatPrice(baseAmount, "UZS")}</span>
          </div>
          {discount > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm text-success">
              <span>Chegirma ({promo?.discountPercent}%)</span>
              <span>−{formatPrice(discount, "UZS")}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-accent/20 pt-2">
            <span className="font-medium text-foreground">Jami</span>
            <span className="text-2xl font-bold text-accent">{formatPrice(finalAmount, "UZS")}</span>
          </div>
          {lifetime && <p className="mt-1 text-xs text-muted">Umrbod — hech qachon tugamaydi</p>}
        </div>

        <div>
          <Label>1. Quyidagi kartaga o'tkazing</Label>
          {loadingCards ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
              Hozircha to'lov kartasi qo'shilmagan. Admin bilan bog'laning.
            </p>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{c.bankName}</span>
                    <button
                      onClick={() => copyCard(c.cardNumber)}
                      className="flex items-center gap-1 text-xs text-accent"
                    >
                      {copied === c.cardNumber ? (
                        <>
                          <Check className="h-3 w-3" /> Nusxalandi
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Nusxalash
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-lg tracking-wider text-foreground">
                    {c.cardNumber}
                  </p>
                  <p className="text-sm text-muted">{c.cardHolder}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>2. To'lov chekini yuklang</Label>
          {receipt ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt}
                alt="chek"
                className="h-32 rounded-lg border border-border object-cover"
              />
              <button
                onClick={() => setReceipt("")}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-muted hover:border-accent hover:text-accent">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="mt-1 text-sm">Chek rasmini tanlang</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadReceipt}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} disabled={submitting || !receipt}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            So'rov yuborish
          </Button>
        </div>
      </div>
    </Modal>
  );
}
