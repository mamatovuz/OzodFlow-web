"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Clock, Volume2, VolumeX, RefreshCw, StickyNote } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { formatPrice, parseJson } from "@/lib/utils";
import { ORDER_STATUSES, statusMeta, type OrderItem } from "@/lib/orders";

type Order = {
  id: string;
  number: number;
  tableName: string | null;
  phone: string | null;
  comment: string | null;
  status: string;
  total: number;
  items: string;
  createdAt: string;
};

const tabs = [
  { key: "", label: "Hammasi" },
  ...ORDER_STATUSES.map((s) => ({ key: s.key, label: s.label })),
];

// Keyingi holatga o'tkazish tugmalari
const NEXT: Record<string, { to: string; label: string }[]> = {
  NEW: [
    { to: "ACCEPTED", label: "Qabul qilish" },
    { to: "CANCELLED", label: "Bekor" },
  ],
  ACCEPTED: [{ to: "PREPARING", label: "Tayyorlashga" }],
  PREPARING: [{ to: "READY", label: "Tayyor" }],
  READY: [{ to: "DELIVERED", label: "Yetkazildi" }],
};

export function OrdersBoard({ currency }: { currency: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const lastIdRef = useRef<string | null>(null);
  const firstLoad = useRef(true);

  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success) {
        const list: Order[] = json.data.orders;
        const newest = list[0]?.id ?? null;
        // Yangi buyurtma keldi
        if (
          !firstLoad.current &&
          newest &&
          newest !== lastIdRef.current &&
          !silent
        ) {
          if (soundOn) playBeep();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🆕 Yangi buyurtma!", {
              body: `Buyurtma #${list[0].number}`,
            });
          }
        }
        lastIdRef.current = newest;
        firstLoad.current = false;
        setOrders(list);
      }
      setLoading(false);
    },
    [soundOn, playBeep]
  );

  useEffect(() => {
    load();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const iv = setInterval(() => load(), 5000);
    return () => clearInterval(iv);
  }, [load]);

  async function setOrderStatus(id: string, newStatus: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load(true);
  }

  const visible = status
    ? orders.filter((o) => o.status === status)
    : orders;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const count = t.key
              ? orders.filter((o) => o.status === t.key).length
              : orders.length;
            return (
              <button
                key={t.key || "all"}
                onClick={() => setStatus(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  status === t.key
                    ? "bg-accent text-white"
                    : "bg-card text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-1.5 opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            title="Ovozli signal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => load(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">
          Buyurtmalar yo'q
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              currency={currency}
              onStatus={setOrderStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order: o,
  currency,
  onStatus,
}: {
  order: Order;
  currency: string;
  onStatus: (id: string, s: string) => void;
}) {
  const items = parseJson<OrderItem[]>(o.items, []);
  const meta = statusMeta(o.status);
  const time = new Date(o.createdAt).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const actions = NEXT[o.status] || [];

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-foreground">Buyurtma #{o.number}</p>
          {o.tableName && (
            <p className="text-sm font-medium text-accent">{o.tableName}</p>
          )}
        </div>
        <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3">
        {items.map((it, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-foreground">
              {it.qty} × {it.name}
            </span>
            <span className="text-muted">{formatPrice(it.price * it.qty, currency)}</span>
          </div>
        ))}
      </div>

      {o.comment && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-foreground">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted" />
          {o.comment}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3 w-3" /> {time}
        </span>
        <span className="font-bold text-foreground">{formatPrice(o.total, currency)}</span>
      </div>

      {o.phone && (
        <a href={`tel:${o.phone}`} className="mt-1 text-xs text-accent">
          {o.phone}
        </a>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {actions.map((a) => (
            <Button
              key={a.to}
              size="sm"
              variant={a.to === "CANCELLED" ? "outline" : "primary"}
              className="flex-1"
              onClick={() => onStatus(o.id, a.to)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
