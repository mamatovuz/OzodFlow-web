"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Crown,
  Loader2,
  Copy,
  Upload,
  Clock,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button, Card, Badge, Label } from "@/components/ui";
import { Modal } from "@/components/ui-modal";
import { formatPrice } from "@/lib/utils";
import { PLANS, type PlanKey } from "@/lib/plans";

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
  const [modal, setModal] = useState<PlanKey | null>(null);

  async function loadRequests() {
    const res = await fetch("/api/payment/request");
    const json = await res.json();
    if (json.success) setRequests(json.data);
  }

  useEffect(() => {
    loadRequests();
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
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl font-bold text-foreground">
            {PLANS[currentPlan].name}
          </span>
          {currentPlan === "FREE" && daysLeft !== null && (
            <Badge variant={expired ? "error" : daysLeft <= 2 ? "warning" : "accent"}>
              {expired ? "Muddati tugagan" : `${daysLeft} kun qoldi`}
            </Badge>
          )}
          {currentPlan !== "FREE" && <Badge variant="success">Umrbod</Badge>}
        </div>
        {currentPlan === "FREE" && (
          <p className="mt-2 text-sm text-muted">
            Sinov muddati tugagach, mahsulotlar 20 tagacha cheklanadi. Umrbod
            foydalanish uchun tarifni yangilang.
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

      {/* Tariflar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {order.map((key) => {
          const p = PLANS[key];
          const isCurrent = currentPlan === key && !expired;
          return (
            <Card
              key={key}
              className={`flex flex-col p-5 ${
                key === "PROMAX" ? "border-accent ring-1 ring-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                {isCurrent && <Badge variant="accent">Joriy</Badge>}
                {key === "PROMAX" && !isCurrent && (
                  <Badge variant="accent">Top</Badge>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {p.price === 0 ? "0" : formatPrice(p.price, "UZS")}
                </span>
                {p.oneTime && (
                  <span className="text-xs text-muted">/ bir martalik</span>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              {key !== "FREE" && !isCurrent && (
                <Button
                  className="mt-5 w-full"
                  variant={key === "PROMAX" ? "primary" : "outline"}
                  disabled={!!pending}
                  onClick={() => setModal(key)}
                >
                  {pending ? "So'rov kutilmoqda" : `${p.name} sotib olish`}
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
                    {PLANS[r.plan as PlanKey].name} —{" "}
                    {formatPrice(r.amount, "UZS")}
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
      <span
        className="flex items-center gap-1 text-sm text-error"
        title={note || ""}
      >
        <XCircle className="h-4 w-4" /> Rad etilgan
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-sm text-warning">
      <Clock className="h-4 w-4" /> Kutilmoqda
    </span>
  );
}

// ─── To'lov modal ───
function PaymentModal({
  plan,
  onClose,
  onDone,
}: {
  plan: PlanKey;
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

  useEffect(() => {
    fetch("/api/payment/cards")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCards(j.data);
        setLoadingCards(false);
      });
  }, []);

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
      body: JSON.stringify({ plan, receiptImage: receipt }),
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
        <div className="rounded-xl bg-accent-soft p-4 text-center">
          <p className="text-sm text-muted">To'lov summasi</p>
          <p className="text-2xl font-bold text-accent">
            {formatPrice(PLANS[plan].price, "UZS")}
          </p>
          <p className="text-xs text-muted">Bir martalik — umrbod</p>
        </div>

        {/* Kartalar */}
        <div>
          <Label>1. Quyidagi kartaga o'tkazing</Label>
          {loadingCards ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
              Hozircha to'lov kartasi qo'shilmagan. Iltimos, admin bilan
              bog'laning.
            </p>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">
                      {c.bankName}
                    </span>
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

        {/* Chek yuklash */}
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
        <p className="text-center text-xs text-muted">
          So'rov yuborilgach, admin chekni tekshiradi va tarifni faollashtiradi.
        </p>
      </div>
    </Modal>
  );
}
