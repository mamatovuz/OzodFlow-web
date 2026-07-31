"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Clock, Volume2, VolumeX, StickyNote, ChefHat, CheckCheck } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { formatPrice, parseJson } from "@/lib/utils";
import { statusMeta, type OrderItem } from "@/lib/orders";

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

// Rol bo'yicha ko'rsatiladigan holatlar va tugmalar
const ROLE_CONFIG: Record<
  string,
  { show: string[]; actions: Record<string, { to: string; label: string }[]> }
> = {
  KITCHEN: {
    show: ["NEW", "ACCEPTED", "PREPARING"],
    actions: {
      NEW: [{ to: "PREPARING", label: "Tayyorlashni boshlash" }],
      ACCEPTED: [{ to: "PREPARING", label: "Tayyorlashni boshlash" }],
      PREPARING: [{ to: "READY", label: "Tayyor" }],
    },
  },
  WAITER: {
    show: ["PREPARING", "READY"],
    actions: {
      READY: [{ to: "DELIVERED", label: "Yetkazdim" }],
    },
  },
  OPERATOR: {
    show: ["NEW", "ACCEPTED", "PREPARING", "READY"],
    actions: {
      NEW: [{ to: "ACCEPTED", label: "Qabul qilish" }, { to: "CANCELLED", label: "Bekor" }],
      ACCEPTED: [{ to: "PREPARING", label: "Tayyorlashga" }],
      PREPARING: [{ to: "READY", label: "Tayyor" }],
      READY: [{ to: "DELIVERED", label: "Yetkazildi" }],
    },
  },
  CASHIER: {
    show: ["NEW", "ACCEPTED", "PREPARING", "READY"],
    actions: {
      NEW: [{ to: "ACCEPTED", label: "Qabul qilish" }, { to: "CANCELLED", label: "Bekor" }],
      READY: [{ to: "DELIVERED", label: "Yetkazildi" }],
    },
  },
};

type SvcCall = { id: string; type: string; tableName: string | null; createdAt: string };

export function StaffOrders({ role, currency }: { role: string; currency: string }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.OPERATOR;
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<SvcCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const lastIdRef = useRef<string | null>(null);
  const first = useRef(true);
  // Oshxona chaqiruvlarni ko'rmaydi
  const seesCalls = role !== "KITCHEN";

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      o.start();
      o.frequency.setValueAtTime(1180, ctx.currentTime + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      o.stop(ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (seesCalls) {
      fetch("/api/service")
        .then((r) => r.json())
        .then((j) => j.success && setCalls(j.data))
        .catch(() => {});
    }
    const res = await fetch("/api/orders");
    const json = await res.json();
    if (json.success) {
      const list: Order[] = json.data.orders.filter((o: Order) => cfg.show.includes(o.status));
      const newest = list[0]?.id ?? null;
      if (!first.current && newest && newest !== lastIdRef.current && !silent && soundOn) beep();
      lastIdRef.current = newest;
      first.current = false;
      setOrders(list);
    }
    setLoading(false);
  }, [cfg.show, soundOn, beep]);

  useEffect(() => {
    load();
    const iv = setInterval(() => load(), 5000);
    return () => clearInterval(iv);
  }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load(true);
  }
  async function resolveCall(id: string) {
    await fetch(`/api/service/${id}`, { method: "PATCH" });
    load(true);
  }

  return (
    <div>
      {/* Chaqiruvlar (ofitsiant / hisob) */}
      {seesCalls && calls.length > 0 && (
        <div className="mb-4 space-y-2">
          {calls.map((c) => (
            <Card
              key={c.id}
              className={`flex items-center justify-between p-3 ${
                c.type === "WAITER" ? "border-warning/40 bg-warning/5" : "border-accent/40 bg-accent-soft"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                🛎 {c.tableName || "Stol"} —{" "}
                {c.type === "WAITER" ? "ofitsiant chaqirdi" : "hisob so'radi"}
              </span>
              <Button size="sm" onClick={() => resolveCall(c.id)}>
                {c.type === "WAITER" ? "Borayapman" : "Hisob berildi"}
              </Button>
            </Card>
          ))}
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{orders.length} ta buyurtma</p>
        <button
          onClick={() => setSoundOn((s) => !s)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          {role === "KITCHEN" ? (
            <ChefHat className="h-10 w-10 text-muted/40" />
          ) : (
            <CheckCheck className="h-10 w-10 text-muted/40" />
          )}
          <p className="mt-3 font-medium text-foreground">Hozircha buyurtma yo'q</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => {
            const items = parseJson<OrderItem[]>(o.items, []);
            const meta = statusMeta(o.status);
            const actions = cfg.actions[o.status] || [];
            const time = new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
            return (
              <Card key={o.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-foreground">#{o.number}</p>
                    {o.tableName && <p className="text-sm font-medium text-accent">{o.tableName}</p>}
                  </div>
                  <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                  </span>
                </div>
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{it.qty} × {it.name}</span>
                    </div>
                  ))}
                </div>
                {o.comment && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-foreground">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-warning" /> {o.comment}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3 w-3" /> {time}
                  </span>
                  {role !== "KITCHEN" && (
                    <span className="text-sm font-bold text-foreground">{formatPrice(o.total, currency)}</span>
                  )}
                </div>
                {actions.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {actions.map((a) => (
                      <Button
                        key={a.to}
                        size="sm"
                        variant={a.to === "CANCELLED" ? "outline" : "primary"}
                        className="flex-1"
                        onClick={() => setStatus(o.id, a.to)}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
