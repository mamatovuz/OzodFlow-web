"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Volume2, VolumeX, Maximize2, Minimize2, LogOut, Clock, Ban, Check, Undo2, X,
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
  waiterName: string | null;
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
  const [station, setStation] = useState<string>(""); // "" = barcha bo'limlar
  const [cancelling, setCancelling] = useState<Order | null>(null); // bekor qilish modali
  // Ovoz uchun: ilgari ko'rilgan "yangi" buyurtma ID lari
  const seenRef = useRef<Set<string>>(new Set());
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
        // Har bir "yangi" (NEW/ACCEPTED) buyurtma ID sini kuzatamiz.
        // Ilgari ko'rilmagan ID paydo bo'lsa — bir necha kelsa ham — ovoz chalamiz.
        const currentNew = active
          .filter((o) => o.status === "NEW" || o.status === "ACCEPTED")
          .map((o) => o.id);
        if (!first.current && soundRef.current) {
          const hasFresh = currentNew.some((id) => !seenRef.current.has(id));
          if (hasFresh) beep();
        }
        // Kuzatuv to'plamini faol yangilar bilan yangilaymiz (o'tib ketganlar chiqadi)
        seenRef.current = new Set(currentNew);
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

  // Bitta taomni "tayyor" deb belgilash (item-level). Hammasi bo'lsa — server READY qiladi.
  async function toggleItem(order: Order, idx: number, done: boolean) {
    const items = parseJson<OrderItem[]>(order.items, []);
    items[idx] = { ...items[idx], done };
    const optimistic = JSON.stringify(items);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: optimistic } : o)));
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIndex: idx, done }),
    }).catch(() => {});
    load();
  }

  // Bekor qilish (masalan taom tugadi) — modal orqali, sabab bilan.
  async function doCancel(id: string, reason: string) {
    setCancelling(null);
    setBusyId(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", cancelReason: reason.trim() || "Bekor qilindi" }),
    }).catch(() => {});
    setBusyId(null);
    load();
  }

  // Faol buyurtmalardagi bo'limlar (stansiya filtri uchun)
  const stations = Array.from(
    new Set(
      orders.flatMap((o) => parseJson<OrderItem[]>(o.items, []).map((it) => it.categoryName).filter(Boolean))
    )
  ) as string[];

  // Stansiya bo'yicha filtr: shu bo'lim taomi bo'lgan buyurtmalar
  const visible = station
    ? orders.filter((o) => parseJson<OrderItem[]>(o.items, []).some((it) => it.categoryName === station))
    : orders;

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
      {/* Yuqori panel — sokin, minimalist */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Oshxona</h1>
          <span className="truncate text-xs text-muted">{restaurantName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-sm tabular-nums text-muted">
            <span className="font-semibold text-foreground">{total}</span> faol
          </span>
          <IconBtn onClick={() => setSoundOn((s) => !s)} active={soundOn} title="Ovoz">
            {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
          </IconBtn>
          <IconBtn onClick={toggleFull} title="To'liq ekran">
            {full ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </IconBtn>
          <IconBtn onClick={logout} title="Chiqish">
            <LogOut className="h-[18px] w-[18px]" />
          </IconBtn>
        </div>
      </header>

      {/* Bo'lim (stansiya) filtri — sokin matn tablari */}
      {stations.length > 1 && (
        <div className="flex items-center gap-4 overflow-x-auto border-b border-border bg-card px-4 py-2.5">
          <button
            onClick={() => setStation("")}
            className={`shrink-0 border-b-2 pb-0.5 text-sm transition ${station === "" ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            Barchasi
          </button>
          {stations.map((s) => (
            <button
              key={s}
              onClick={() => setStation(s)}
              className={`shrink-0 border-b-2 pb-0.5 text-sm transition ${station === s ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {COLUMNS.map((col) => {
              const list = visible
                .filter((o) => col.statuses.includes(o.status))
                .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
              return (
                <div key={col.key} className="flex flex-col md:min-h-[40vh]">
                  <div className="mb-3 flex items-center gap-2 px-0.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">{col.title}</span>
                    <span className="text-xs tabular-nums text-muted/60">{list.length}</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {list.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted/40">—</p>
                    ) : (
                      list.map((o) => (
                        <KitchenCard
                          key={o.id}
                          order={o}
                          now={now}
                          col={col.key}
                          busy={busyId === o.id}
                          onAdvance={advance}
                          onCancel={() => setCancelling(o)}
                          onToggleItem={toggleItem}
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

      {cancelling && (
        <CancelModal
          order={cancelling}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) => doCancel(cancelling.id, reason)}
        />
      )}
    </div>
  );
}

function KitchenCard({
  order, now, col, busy, onAdvance, onCancel, onToggleItem,
}: {
  order: Order;
  now: number;
  col: string;
  busy: boolean;
  onAdvance: (id: string, to: string) => void;
  onCancel: () => void;
  onToggleItem: (order: Order, idx: number, done: boolean) => void;
}) {
  const items = parseJson<OrderItem[]>(order.items, []);
  const mins = Math.floor((now - +new Date(order.createdAt)) / 60000);
  // Kechikish vaqt rangi bilan bildiriladi (sokin, miltillashsiz):
  // 0–10 daq — sokin, 10–15 daq — sariq ogohlantirish, 15+ daq — qizil "Kechikdi".
  const late = mins >= 15;
  const warn = mins >= 10 && mins < 15;
  const timeColor = late ? "text-error" : warn ? "text-warning" : "text-muted";
  const isDelivery = order.orderType === "DELIVERY";
  const canCheck = col === "new" || col === "prep"; // ready ustunда belgilamaymiz
  const doneCount = items.filter((it) => it.done).length;

  // Oshxona faqat NEW→PREPARING→READY qiladi; yetkazish (DELIVERED) — ofitsant ishi
  const action =
    col === "new"
      ? { to: "PREPARING", label: "Boshlash" }
      : col === "prep"
      ? { to: "READY", label: "Tayyor" }
      : null;

  return (
    <div className={`rounded-xl border bg-card p-3.5 transition ${late ? "border-error/40" : "border-border"}`}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-foreground">#{order.number}</span>
          <span className="text-[13px] text-muted">
            {isDelivery ? "Yetkazish" : order.tableName || "Zalda"}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {late && (
            <span className="rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-error">
              Kechikdi
            </span>
          )}
          <span className={`flex items-center gap-1 text-[13px] tabular-nums ${timeColor}`}>
            <Clock className="h-3 w-3" /> {mins}′
          </span>
          <button
            onClick={onCancel}
            title="Bekor qilish"
            className="text-muted/40 transition hover:text-error"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {order.waiterName && <p className="mt-0.5 text-xs text-muted">{order.waiterName}</p>}

      {/* Taomlar — oshxonada har birini belgilash mumkin (item-level) */}
      <ul className="mt-3 space-y-1">
        {items.map((it, i) =>
          canCheck ? (
            <li key={i}>
              <button
                onClick={() => onToggleItem(order, i, !it.done)}
                className="flex w-full items-baseline gap-2.5 rounded-md py-1 text-left text-[15px] leading-tight transition hover:bg-surface-2"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    it.done ? "border-success bg-success text-white" : "border-border"
                  }`}
                >
                  {it.done && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">{it.qty}×</span>
                <span className={it.done ? "text-muted line-through" : "text-foreground"}>
                  {it.name}
                  {it.comment ? <span className="block text-xs text-error/80 no-underline">{it.comment}</span> : null}
                </span>
              </button>
            </li>
          ) : (
            <li key={i} className="flex items-baseline gap-2.5 py-0.5 text-[15px] leading-tight text-foreground">
              <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">{it.qty}×</span>
              <span>
                {it.name}
                {it.comment ? <span className="block text-xs text-error/80">{it.comment}</span> : null}
              </span>
            </li>
          )
        )}
      </ul>

      {order.comment && (
        <p className="mt-2.5 border-l-2 border-border pl-2 text-xs text-muted">{order.comment}</p>
      )}

      {action ? (
        <div className="mt-3.5 flex items-center gap-2">
          {/* Prep ustunida orqaga qaytarish (recall) */}
          {col === "prep" && (
            <button
              disabled={busy}
              onClick={() => onAdvance(order.id, "NEW")}
              title="Yangiga qaytarish"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => onAdvance(order.id, action.to)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-[15px] font-medium text-white transition hover:bg-accent-hover active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}
            {canCheck && doneCount > 0 && (
              <span className="text-xs opacity-80">({doneCount}/{items.length})</span>
            )}
          </button>
        </div>
      ) : (
        // Tayyor ustuni — ofitsant yetkazadi + xato bo'lsa qaytarish (recall)
        <div className="mt-3.5 flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => onAdvance(order.id, "PREPARING")}
            title="Tayyorlashga qaytarish"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <p className="flex-1 rounded-lg bg-success/10 py-2 text-center text-[13px] font-medium text-success">
            Ofitsant yetkazadi
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Bekor qilish modali (window.prompt o'rniga — ekranni bloklamaydi) ───
const KITCHEN_REASONS = ["Osh/taom tugadi", "Mahsulot yo'q", "Mijoz bekor qildi", "Xato buyurtma"];

function CancelModal({
  order, onClose, onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl bg-card p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">#{order.number} — bekor qilish</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <label className="mb-1.5 block text-xs text-muted">Sabab</label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {KITCHEN_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${reason === r ? "bg-error text-white" : "bg-surface-2 text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Yoki o'zingiz yozing..."
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={() => onConfirm(reason)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-error py-3 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <Ban className="h-4 w-4" /> Buyurtmani bekor qilish
        </button>
      </div>
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
