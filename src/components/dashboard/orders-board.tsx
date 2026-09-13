"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Loader2, Clock, Volume2, VolumeX, RefreshCw, StickyNote, Search,
  ChevronRight, Phone, MapPin, Receipt, Truck, X,
} from "lucide-react";
import { Card, Button, Drawer } from "@/components/ui";
import { formatPrice, parseJson, cn } from "@/lib/utils";
import { ORDER_STATUSES, statusMeta, type OrderItem } from "@/lib/orders";

type Order = {
  id: string;
  number: number;
  tableName: string | null;
  tableCode?: string | null;
  phone: string | null;
  comment: string | null;
  orderType?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  status: string;
  total: number;
  subtotal?: number;
  discount?: number;
  serviceCharge?: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
  waiterName?: string | null;
  items: string;
  createdAt: string;
  posOrderId?: string | null;
  posError?: string | null;
};

// Tablar — spec bo'yicha tartib (holat + "To'langan" virtual filtri)
type Tab = { key: string; label: string; kind: "all" | "status" | "paid" };
const TABS: Tab[] = [
  { key: "", label: "Hammasi", kind: "all" },
  { key: "NEW", label: "Yangi", kind: "status" },
  { key: "ACCEPTED", label: "Qabul qilingan", kind: "status" },
  { key: "PREPARING", label: "Tayyorlanmoqda", kind: "status" },
  { key: "READY", label: "Tayyor", kind: "status" },
  { key: "DELIVERED", label: "Yetkazilgan", kind: "status" },
  { key: "PAID", label: "To'langan", kind: "paid" },
  { key: "CANCELLED", label: "Bekor qilingan", kind: "status" },
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

function matchTab(o: Order, tab: Tab): boolean {
  if (tab.kind === "all") return true;
  if (tab.kind === "paid") return o.paymentStatus === "PAID";
  return o.status === tab.key;
}

function orderLine(o: Order): string {
  if (o.orderType === "DELIVERY") return "Yetkazib berish";
  return o.tableName || o.tableCode || "Stol —";
}

export function OrdersBoard({ currency }: { currency: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tabKey, setTabKey] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
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
        if (!firstLoad.current && newest && newest !== lastIdRef.current && !silent) {
          if (soundOn) playBeep();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🆕 Yangi buyurtma!", { body: `Buyurtma #${list[0].number}` });
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

  const activeTab = TABS.find((t) => t.key === tabKey) ?? TABS[0];
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!matchTab(o, activeTab)) return false;
      if (!term) return true;
      return (
        String(o.number).includes(term) ||
        (o.tableName || "").toLowerCase().includes(term) ||
        (o.tableCode || "").toLowerCase().includes(term) ||
        (o.phone || "").toLowerCase().includes(term) ||
        (o.waiterName || "").toLowerCase().includes(term)
      );
    });
  }, [orders, activeTab, q]);

  const openOrder = openId ? orders.find((o) => o.id === openId) ?? null : null;

  return (
    <div>
      {/* ─── Header: qidiruv + boshqaruv ─── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Raqam, stol, telefon yoki ofitsant bo'yicha qidirish..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            title="Ovozli signal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => load(true)}
            title="Yangilash"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Tablar ─── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = orders.filter((o) => matchTab(o, t)).length;
          const active = tabKey === t.key;
          return (
            <button
              key={t.key || "all"}
              onClick={() => setTabKey(t.key)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-accent text-white" : "bg-card text-muted hover:text-foreground border border-border"
              )}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 opacity-70 tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">
          {q ? `"${q}" bo'yicha buyurtma topilmadi` : "Buyurtmalar yo'q"}
        </Card>
      ) : (
        <>
          {/* Desktop jadval */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Buyurtma</th>
                    <th className="px-4 py-3 font-medium">Joy</th>
                    <th className="px-4 py-3 font-medium">Turi</th>
                    <th className="px-4 py-3 font-medium">Mahsulotlar</th>
                    <th className="px-4 py-3 text-right font-medium">Jami</th>
                    <th className="px-4 py-3 font-medium">Ofitsant</th>
                    <th className="px-4 py-3 font-medium">Holat</th>
                    <th className="px-4 py-3 font-medium">Vaqt</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const meta = statusMeta(o.status);
                    const items = parseJson<OrderItem[]>(o.items, []);
                    const count = items.reduce((s, it) => s + (it.qty || 0), 0);
                    return (
                      <tr
                        key={o.id}
                        onClick={() => setOpenId(o.id)}
                        className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-2"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground tabular-nums">#{o.number}</td>
                        <td className="px-4 py-3 text-foreground">{orderLine(o)}</td>
                        <td className="px-4 py-3">
                          {o.orderType === "DELIVERY" ? (
                            <span className="inline-flex items-center gap-1 text-accent"><Truck className="h-3.5 w-3.5" /> Yetkazish</span>
                          ) : (
                            <span className="text-muted">Zalda</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {count} ta{items[0] ? ` · ${items[0].name}${items.length > 1 ? "…" : ""}` : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatPrice(o.total, currency)}</td>
                        <td className="px-4 py-3 text-muted">{o.waiterName || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", meta.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted tabular-nums">
                          {new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-3 text-muted"><ChevronRight className="h-4 w-4" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobil kartalar */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {visible.map((o) => {
              const meta = statusMeta(o.status);
              const items = parseJson<OrderItem[]>(o.items, []);
              const count = items.reduce((s, it) => s + (it.qty || 0), 0);
              return (
                <button key={o.id} onClick={() => setOpenId(o.id)} className="text-left">
                  <Card className="flex h-full flex-col p-4 transition-all active:scale-[0.99]">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-foreground">#{o.number}</p>
                        <p className="text-sm text-accent">{orderLine(o)}</p>
                      </div>
                      <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", meta.badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{count} ta mahsulot{o.waiterName ? ` · ${o.waiterName}` : ""}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3 w-3" />
                        {new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-bold text-foreground">{formatPrice(o.total, currency)}</span>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Detal Drawer ─── */}
      <OrderDrawer
        order={openOrder}
        currency={currency}
        onClose={() => setOpenId(null)}
        onStatus={(id, s) => {
          setOrderStatus(id, s);
          if (s === "CANCELLED" || s === "DELIVERED") setOpenId(null);
        }}
      />
    </div>
  );
}

function OrderDrawer({
  order: o,
  currency,
  onClose,
  onStatus,
}: {
  order: Order | null;
  currency: string;
  onClose: () => void;
  onStatus: (id: string, s: string) => void;
}) {
  if (!o) return null;
  const items = parseJson<OrderItem[]>(o.items, []);
  const meta = statusMeta(o.status);
  const actions = NEXT[o.status] || [];
  const hasAdjustments = (o.discount || 0) > 0 || (o.serviceCharge || 0) > 0;
  const payMethodLabel: Record<string, string> = { CASH: "Naqd", CARD: "Karta", MIXED: "Aralash" };

  return (
    <Drawer
      open={!!o}
      onClose={onClose}
      title={`Buyurtma #${o.number}`}
      subtitle={orderLine(o)}
      footer={
        <div className="space-y-2">
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((a) => (
                <Button
                  key={a.to}
                  size="md"
                  variant={a.to === "CANCELLED" ? "outline" : "primary"}
                  className="flex-1"
                  onClick={() => onStatus(o.id, a.to)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
          <a
            href={`/receipt/${o.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-2"
          >
            <Receipt className="h-4 w-4" /> Chek chiqarish
          </a>
        </div>
      }
    >
      {/* Holat + POS */}
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", meta.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
        {o.paymentStatus === "PAID" && (
          <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
            To'langan{o.paymentMethod ? ` · ${payMethodLabel[o.paymentMethod] ?? o.paymentMethod}` : ""}
          </span>
        )}
        {o.posOrderId && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">POS ✓</span>}
        {o.posError && <span title={o.posError} className="rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error">POS ✗</span>}
      </div>

      {/* Mahsulotlar */}
      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="text-foreground">{it.qty} × {it.name}</span>
              {it.comment && <p className="text-xs text-muted">{it.comment}</p>}
            </div>
            <span className="shrink-0 text-muted">{formatPrice(it.price * it.qty, currency)}</span>
          </div>
        ))}
      </div>

      {/* Izoh */}
      {o.comment && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm text-foreground">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          {o.comment}
        </div>
      )}

      {/* Yetkazish */}
      {o.orderType === "DELIVERY" && (
        <div className="mt-3 rounded-lg bg-accent-soft px-3 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-accent"><Truck className="h-4 w-4" /> Yetkazib berish</p>
          {o.address && <p className="mt-1 text-foreground">{o.address}</p>}
          {o.lat != null && o.lng != null && (
            <a
              href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> Xaritada ochish
            </a>
          )}
        </div>
      )}

      {/* Summa tafsiloti */}
      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        {hasAdjustments && (
          <>
            <Row label="Oraliq summa" value={formatPrice(o.subtotal || o.total, currency)} muted />
            {(o.discount || 0) > 0 && <Row label="Chegirma" value={`− ${formatPrice(o.discount || 0, currency)}`} tone="success" />}
            {(o.serviceCharge || 0) > 0 && <Row label="Xizmat haqi" value={`+ ${formatPrice(o.serviceCharge || 0, currency)}`} muted />}
          </>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-foreground">Jami</span>
          <span className="text-lg font-bold text-foreground">{formatPrice(o.total, currency)}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <Row label="Vaqt" value={new Date(o.createdAt).toLocaleString("uz-UZ")} muted />
        {o.waiterName && <Row label="Ofitsant" value={o.waiterName} muted />}
        {o.phone && (
          <div className="flex items-center justify-between">
            <span className="text-muted">Telefon</span>
            <a href={`tel:${o.phone}`} className="flex items-center gap-1 font-medium text-accent">
              <Phone className="h-3.5 w-3.5" /> {o.phone}
            </a>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function Row({ label, value, muted, tone }: { label: string; value: string; muted?: boolean; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("font-medium", tone === "success" ? "text-success" : muted ? "text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
