"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Volume2, VolumeX, LogOut, Bell, Receipt, Truck, Utensils,
  Clock, Check, CheckCheck, ConciergeBell, StickyNote,
} from "lucide-react";
import { parseJson, formatPrice } from "@/lib/utils";
import type { OrderItem } from "@/lib/orders";

type Order = {
  id: string;
  number: number;
  tableName: string | null;
  orderType: string;
  comment: string | null;
  status: string;
  total: number;
  items: string;
  createdAt: string;
};
type SvcCall = { id: string; type: string; tableName: string | null; createdAt: string };

type Tab = "calls" | "deliver" | "today";

// Ofitsant paneli — telefon uchun. 3 bo'lim: Chaqiruvlar (stol chaqirdi/hisob),
// Yetkazish (tayyor buyurtmalar), Bugun (yetkazilganlar soni + summa).
export function WaiterPanel({
  restaurantName,
  staffName,
  currency,
}: {
  restaurantName: string;
  staffName: string;
  currency: string;
}) {
  const [tab, setTab] = useState<Tab>("calls");
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<SvcCall[]>([]);
  const [doneToday, setDoneToday] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastCallRef = useRef<number>(0);
  const first = useRef(true);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "triangle"; o.frequency.value = 660;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      o.start();
      o.frequency.setValueAtTime(990, ctx.currentTime + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      o.stop(ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const [oRes, cRes, dRes] = await Promise.all([
        fetch("/api/orders?limit=100"),
        fetch("/api/service"),
        fetch("/api/orders?status=DELIVERED&limit=100"),
      ]);
      const oJson = await oRes.json();
      const cJson = await cRes.json();
      const dJson = await dRes.json();

      if (oJson.success) {
        setOrders(oJson.data.orders.filter((o: Order) => o.status === "READY"));
      }
      if (cJson.success) {
        const list: SvcCall[] = cJson.data;
        if (!first.current && list.length > lastCallRef.current && soundRef.current) beep();
        lastCallRef.current = list.length;
        setCalls(list);
      }
      if (dJson.success) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setDoneToday(
          dJson.data.orders.filter((o: Order) => new Date(o.createdAt) >= today)
        );
      }
      first.current = false;
    } catch { /* ignore */ }
    setLoading(false);
  }, [beep]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  async function deliver(id: string) {
    setBusyId(id);
    setOrders((p) => p.filter((o) => o.id !== id));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    }).catch(() => {});
    setBusyId(null);
    load();
  }
  async function resolveCall(id: string) {
    setBusyId(id);
    setCalls((p) => p.filter((c) => c.id !== id));
    await fetch(`/api/service/${id}`, { method: "PATCH" }).catch(() => {});
    setBusyId(null);
    load();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const todaySum = doneToday.reduce((s, o) => s + o.total, 0);

  const TABS: { key: Tab; label: string; icon: typeof Bell; badge?: number }[] = [
    { key: "calls", label: "Chaqiruvlar", icon: Bell, badge: calls.length },
    { key: "deliver", label: "Yetkazish", icon: Truck, badge: orders.length },
    { key: "today", label: "Bugun", icon: CheckCheck },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Yuqori panel */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <ConciergeBell className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight text-foreground">Ofitsant</p>
            <p className="truncate text-xs text-muted">{restaurantName} · {staffName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
              soundOn ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-muted"
            }`}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            onClick={logout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-error"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-[65px] z-20 flex gap-1 border-b border-border bg-card px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4 shrink-0" />
            <span>{t.label}</span>
            {t.badge ? (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : tab === "calls" ? (
          calls.length === 0 ? (
            <Empty icon={Bell} text="Hozircha chaqiruv yo'q" />
          ) : (
            <div className="space-y-2.5">
              {calls.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border-2 bg-card p-3.5 shadow-soft ${
                    c.type === "WAITER" ? "border-warning/50" : "border-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      c.type === "WAITER" ? "bg-warning/15 text-warning" : "bg-accent-soft text-accent"
                    }`}>
                      {c.type === "WAITER" ? <Bell className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{c.tableName || "Stol"}</p>
                      <p className="text-xs text-muted">
                        {c.type === "WAITER" ? "Ofitsant chaqirmoqda" : "Hisob so'ramoqda"}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => resolveCall(c.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
                  >
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {c.type === "WAITER" ? "Bordim" : "Berildi"}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : tab === "deliver" ? (
          orders.length === 0 ? (
            <Empty icon={CheckCheck} text="Yetkazish uchun tayyor buyurtma yo'q" />
          ) : (
            <div className="space-y-2.5">
              {orders.map((o) => (
                <DeliverCard key={o.id} order={o} currency={currency} busy={busyId === o.id} onDeliver={deliver} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Bugun yetkazildi" value={String(doneToday.length)} icon={CheckCheck} />
              <StatBox label="Bugungi summa" value={formatPrice(todaySum, currency)} icon={Receipt} />
            </div>
            {doneToday.length === 0 ? (
              <Empty icon={CheckCheck} text="Bugun hali yetkazilgan buyurtma yo'q" />
            ) : (
              <div className="space-y-2">
                {doneToday.slice(0, 20).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="text-muted">#{o.number}</span>
                      {o.orderType === "DELIVERY" ? <Truck className="h-4 w-4 text-accent" /> : <Utensils className="h-4 w-4 text-muted" />}
                      {o.tableName || (o.orderType === "DELIVERY" ? "Yetkazish" : "Zalda")}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{formatPrice(o.total, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function DeliverCard({
  order, currency, busy, onDeliver,
}: {
  order: Order;
  currency: string;
  busy: boolean;
  onDeliver: (id: string) => void;
}) {
  const items = parseJson<OrderItem[]>(order.items, []);
  const isDelivery = order.orderType === "DELIVERY";
  const time = new Date(order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-xl border-2 border-success/50 bg-card p-3.5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="text-lg font-extrabold text-foreground">#{order.number}</span>
          {isDelivery ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              <Truck className="h-3 w-3" /> Yetkazish
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-foreground">
              <Utensils className="h-3 w-3" /> {order.tableName || "Zalda"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {time}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-sm text-foreground">
        {items.map((it, i) => (
          <li key={i}><b className="text-accent">{it.qty}×</b> {it.name}</li>
        ))}
      </ul>
      {order.comment && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-foreground">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {order.comment}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{formatPrice(order.total, currency)}</span>
        <button
          disabled={busy}
          onClick={() => onDeliver(order.id)}
          className="flex items-center gap-1.5 rounded-lg bg-success px-5 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Yetkazdim
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Bell }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Bell; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon className="h-10 w-10 text-muted/40" />
      <p className="mt-3 text-sm font-medium text-muted">{text}</p>
    </div>
  );
}
