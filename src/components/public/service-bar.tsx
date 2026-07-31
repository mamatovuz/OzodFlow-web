"use client";

import { useEffect, useState } from "react";
import { Bell, CreditCard, X, CheckCircle2, Loader2, ChefHat, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { UI, type Lang } from "@/lib/i18n";

// Ofitsiant chaqirish / hisob so'rash tugmalari
export function ServiceButtons({
  slug,
  tableCode,
  accent,
  lang,
}: {
  slug: string;
  tableCode: string | null;
  accent: string;
  lang: Lang;
}) {
  const [confirm, setConfirm] = useState<null | "WAITER" | "BILL">(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | string>(null);

  async function send(type: "WAITER" | "BILL") {
    setSending(true);
    await fetch("/api/service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, tableCode, type }),
    }).catch(() => {});
    setSending(false);
    setConfirm(null);
    setDone(type === "WAITER" ? "Ofitsiant chaqirildi" : "Hisob so'raldi");
    setTimeout(() => setDone(null), 3000);
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setConfirm("WAITER")}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-soft active:scale-[0.98]"
        >
          <Bell className="h-4 w-4" style={{ color: accent }} /> Ofitsiant
        </button>
        <button
          onClick={() => setConfirm("BILL")}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-soft active:scale-[0.98]"
        >
          <CreditCard className="h-4 w-4" style={{ color: accent }} /> Hisob
        </button>
      </div>

      {done && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-success px-4 py-2 text-sm font-medium text-white shadow-card">
            <CheckCircle2 className="h-4 w-4" /> {done}
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirm(null)} />
          <div className="relative z-10 w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-card animate-fade-up">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: `${accent}22`, color: accent }}
            >
              {confirm === "WAITER" ? <Bell className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
            </div>
            <p className="mt-4 font-medium text-foreground">
              {confirm === "WAITER"
                ? "Rostdan ham ofitsiantni chaqirmoqchimisiz?"
                : "Hisobni olib kelishlarini so'raysizmi?"}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => send(confirm)}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-medium text-white"
                style={{ background: accent }}
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Ha, chaqirish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Buyurtma holati kuzatuvi (mijoz uchun)
const TRACK_STEPS = [
  { key: "NEW", label: "Qabul qilindi", icon: CheckCircle2, color: "#d97706" },
  { key: "PREPARING", label: "Tayyorlanmoqda", icon: ChefHat, color: "#ea580c" },
  { key: "READY", label: "Tayyor", icon: Sparkles, color: "#8b5cf6" },
  { key: "DELIVERED", label: "Yetkazildi", icon: CheckCircle2, color: "#16a34a" },
];
// ACCEPTED ni NEW bilan birlashtiramiz
function stepIndex(status: string) {
  if (status === "NEW" || status === "ACCEPTED") return 0;
  if (status === "PREPARING") return 1;
  if (status === "READY") return 2;
  if (status === "DELIVERED") return 3;
  return -1;
}

export function OrderTracker({
  orderId,
  currency,
  accent,
  onClose,
}: {
  orderId: string;
  currency: string;
  accent: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<{ number: number; status: string; total: number } | null>(null);

  useEffect(() => {
    let stop = false;
    async function poll() {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (res.ok) {
        const j = await res.json();
        if (!stop) setOrder(j.data);
      }
    }
    poll();
    const iv = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [orderId]);

  if (!order) return null;
  if (order.status === "CANCELLED") return null;
  const idx = stepIndex(order.status);
  const ready = order.status === "READY";
  const delivered = order.status === "DELIVERED";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div
        className={`mx-auto max-w-2xl rounded-2xl border bg-card p-4 shadow-card ${
          ready ? "border-[#8b5cf6]" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground">
            Buyurtma #{order.number}
            {ready && <span className="ml-2">🎉</span>}
          </p>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {ready && (
          <p className="mt-1 text-sm font-medium text-[#8b5cf6] animate-fade-in">
            🎉 Buyurtmangiz tayyor!
          </p>
        )}

        <div className="mt-3 flex items-center">
          {TRACK_STEPS.map((s, i) => {
            const active = i <= idx;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
                    style={{
                      background: active ? s.color : "var(--surface-2)",
                      color: active ? "#fff" : "var(--muted)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="mt-1 text-[9px] text-muted">{s.label}</span>
                </div>
                {i < TRACK_STEPS.length - 1 && (
                  <div
                    className="mx-1 h-0.5 flex-1 rounded transition-all"
                    style={{ background: i < idx ? s.color : "var(--border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {delivered && (
          <button
            onClick={onClose}
            className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-white"
            style={{ background: accent }}
          >
            Yopish
          </button>
        )}
      </div>
    </div>
  );
}
