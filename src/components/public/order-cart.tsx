"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus, X, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

// Pastdagi doimiy savat paneli
export function FloatingCart({
  count,
  total,
  currency,
  accent,
  onOpen,
}: {
  count: number;
  total: number;
  currency: string;
  accent: string;
  onOpen: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onOpen}
          className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-card transition-transform active:scale-[0.99]"
          style={{ background: accent }}
        >
          <span className="flex items-center gap-2">
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold" style={{ color: accent }}>
                {count}
              </span>
            </span>
            <span className="font-medium">Savat</span>
          </span>
          <span className="font-bold">{formatPrice(total, currency)}</span>
        </button>
      </div>
    </div>
  );
}

// Savat + buyurtma rasmiylashtirish
export function CheckoutModal({
  open,
  onClose,
  items,
  currency,
  accent,
  slug,
  tableCode,
  tableName,
  onSetQty,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  items: CartLine[];
  currency: string;
  accent: string;
  slug: string;
  tableCode: string | null;
  tableName: string | null;
  onSetQty: (id: string, qty: number) => void;
  onClear: () => void;
}) {
  const [step, setStep] = useState<"cart" | "done">("cart");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderNo, setOrderNo] = useState<number | null>(null);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  if (!open) return null;

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        tableCode,
        phone,
        comment,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Xatolik yuz berdi");
      return;
    }
    setOrderNo(json.data.number);
    setStep("done");
    onClear();
  }

  function close() {
    setStep("cart");
    setPhone("");
    setComment("");
    setOrderNo(null);
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card animate-fade-up sm:rounded-3xl">
        {step === "done" ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Buyurtma qabul qilindi!
            </h2>
            <p className="mt-1 text-muted">
              Buyurtma raqami: <b className="text-foreground">#{orderNo}</b>
            </p>
            {tableName && (
              <p className="mt-1 text-sm text-muted">{tableName} · tez orada tayyorlanadi</p>
            )}
            <button
              onClick={close}
              className="mt-6 rounded-xl px-6 py-2.5 font-medium text-white"
              style={{ background: accent }}
            >
              Yopish
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">
                Savat {tableName && <span className="text-muted">· {tableName}</span>}
              </h2>
              <button onClick={close} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Savat bo'sh</p>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.productId} className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {it.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                        <p className="text-sm font-semibold" style={{ color: accent }}>
                          {formatPrice(it.price * it.qty, currency)}
                        </p>
                      </div>
                      <QtyControl
                        qty={it.qty}
                        accent={accent}
                        onChange={(q) => onSetQty(it.productId, q)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="mt-5 space-y-3">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefon (ixtiyoriy)"
                    inputMode="tel"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Izoh (masalan: piyozsiz, achchiqroq)"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted">Jami</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(total, currency)}
                  </span>
                </div>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-white disabled:opacity-60"
                  style={{ background: accent }}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Buyurtmani rasmiylashtirish
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function QtyControl({
  qty,
  accent,
  onChange,
  size = "md",
}: {
  qty: number;
  accent: string;
  onChange: (q: number) => void;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(qty - 1)}
        className={`flex ${btn} items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-2`}
      >
        {qty <= 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </button>
      <span className="w-6 text-center text-sm font-semibold text-foreground">{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        className={`flex ${btn} items-center justify-center rounded-lg text-white`}
        style={{ background: accent }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
