"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Volume2, VolumeX, Maximize2, Minimize2, LogOut, ChefHat,
  Clock, StickyNote, Truck, Utensils, ArrowRight, Check,
} from "lucide-react";
import { parseJson } from "@/lib/utils";
import type { OrderItem } from "@/lib/orders";

type Order = {
  id: string;
  number: number;
  tableName: string | null;
  orderType: string;
  comment: string | null;
  status: string;
  items: string;
  createdAt: string;
};

// Oshxona ekrani (Kitchen Display System) — planshet/monitor uchun.
// 3 ustunli Kanban: Yangi → Tayyorlanmoqda → Tayyor. Har buyurtma o'tgan vaqt
// bo'yicha rang oladi (kechiksa qizil), yangi buyurtmada ovoz chalinadi.
const COLUMNS: { key: string; title: string; statuses: string[]; accent: string }[] = [
  { key: "new", title: "Yangi", statuses: ["NEW", "ACCEPTED"], accent: "var(--accent)" },
  { key: "prep", title: "Tayyorlanmoqda", statuses: ["PREPARING"], accent: "#d97706" },
  { key: "ready", title: "Tayyor", statuses: ["READY"], accent: "#16a34a" },
];

export function KitchenDisplay({
  restaurantName,
  staffName,
}: {
  restaurantName: string;
  staffName: string;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [full, setFull] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
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
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      o.start();
      o.frequency.setValueAtTime(1180, ctx.currentTime + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      o.stop(ctx.currentTime + 0.55);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=100");
      const json = await res.json();
      if (json.success) {
        const active: Order[] = json.data.orders.filter((o: Order) =>
          ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
        );
        // Eng yangi NEW buyurtma paydo bo'lsa — ovoz
        const newest = active.find((o) => o.status === "NEW" || o.status === "ACCEPTED")?.id ?? null;
        if (!first.current && newest && newest !== lastIdRef.current && soundRef.current) beep();
        lastIdRef.current = newest;
        first.current = false;
        setOrders(active);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [beep]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(iv); clearInterval(clock); };
  }, [load]);

  async function advance(id: string, to: string) {
    setBusyId(id);
    // Optimistik: darhol ko'chiramiz
    setOrders((prev) =>
      to === "DELIVERED" ? prev.filter((o) => o.id !== id) : prev.map((o) => (o.id === id ? { ...o, status: to } : o))
    );
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    }).catch(() => {});
    setBusyId(null);
    load();
  }

  function toggleFull() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFull(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFull(false)).catch(() => {});
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const total = orders.length;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Yuqori panel */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground leading-tight">Oshxona</p>
            <p className="truncate text-xs text-muted">{restaurantName} · {staffName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold text-foreground sm:inline-flex">
            {total} faol
          </span>
          <IconBtn onClick={() => setSoundOn((s) => !s)} active={soundOn} title="Ovoz">
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </IconBtn>
          <IconBtn onClick={toggleFull} title="To'liq ekran">
            {full ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </IconBtn>
          <IconBtn onClick={logout} title="Chiqish" danger>
            <LogOut className="h-5 w-5" />
          </IconBtn>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {COLUMNS.map((col) => {
              const list = orders
                .filter((o) => col.statuses.includes(o.status))
                .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
              return (
                <div key={col.key} className="flex min-h-[40vh] flex-col rounded-2xl bg-surface-2/60 p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.accent }} />
                      {col.title}
                    </span>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-sm font-bold text-foreground">
                      {list.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {list.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">
                        Bo'sh
                      </p>
                    ) : (
                      list.map((o) => (
                        <KitchenCard
                          key={o.id}
                          order={o}
                          now={now}
                          col={col.key}
                          busy={busyId === o.id}
                          onAdvance={advance}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenCard({
  order, now, col, busy, onAdvance,
}: {
  order: Order;
  now: number;
  col: string;
  busy: boolean;
  onAdvance: (id: string, to: string) => void;
}) {
  const items = parseJson<OrderItem[]>(order.items, []);
  const mins = Math.floor((now - +new Date(order.createdAt)) / 60000);
  // Vaqtga qarab rang: 0-9 oddiy, 10-14 sariq, 15+ qizil
  const level = mins >= 15 ? "danger" : mins >= 10 ? "warn" : "ok";
  const border =
    level === "danger" ? "border-error/60" : level === "warn" ? "border-warning/60" : "border-border";
  const timeColor =
    level === "danger" ? "text-error" : level === "warn" ? "text-warning" : "text-muted";
  const isDelivery = order.orderType === "DELIVERY";

  const action =
    col === "new"
      ? { to: "PREPARING", label: "Boshlash", icon: ArrowRight }
      : col === "prep"
      ? { to: "READY", label: "Tayyor", icon: Check }
      : { to: "DELIVERED", label: "Berildi", icon: Check };

  return (
    <div
      className={`rounded-xl border-2 bg-card p-3 shadow-soft transition ${border} ${
        level === "danger" ? "animate-pulse-slow" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold text-foreground">#{order.number}</span>
        <span className={`flex items-center gap-1 text-sm font-bold tabular-nums ${timeColor}`}>
          <Clock className="h-3.5 w-3.5" /> {mins}′
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
        {isDelivery ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-accent">
            <Truck className="h-3 w-3" /> Yetkazish
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-foreground">
            <Utensils className="h-3 w-3" /> {order.tableName || "Zalda"}
          </span>
        )}
      </div>

      <ul className="mt-2.5 space-y-1 border-t border-border pt-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2 text-[15px] leading-tight text-foreground">
            <span className="min-w-7 shrink-0 rounded-md bg-surface-2 px-1.5 text-center text-sm font-bold text-accent">
              {it.qty}×
            </span>
            <span className="font-medium">{it.name}</span>
          </li>
        ))}
      </ul>

      {order.comment && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-foreground">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {order.comment}
        </div>
      )}

      <button
        disabled={busy}
        onClick={() => onAdvance(order.id, action.to)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
        {action.label}
      </button>
    </div>
  );
}

function IconBtn({
  children, onClick, title, active, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
        danger
          ? "border-border text-muted hover:border-error/40 hover:text-error"
          : active
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
