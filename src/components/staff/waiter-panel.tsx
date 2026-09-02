"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Volume2, VolumeX, LogOut, Bell, BellRing, Receipt, ChevronLeft, Plus, Minus,
  X, Check, Utensils, Coins, CreditCard, Wallet, Search, ConciergeBell, Armchair,
} from "lucide-react";
import { parseJson, formatPrice } from "@/lib/utils";
import type { OrderItem } from "@/lib/orders";

type TableRow = { id: string; name: string; code: string; status: string; orders: number; total: number };
type SvcCall = { id: string; type: string; tableName: string | null; createdAt: string };
type ReadyOrder = { id: string; number: number; tableName: string | null; items: string; waiterName: string | null; staffId: string | null };
type BillOrder = { id: string; number: number; status: string; total: number; items: string; waiterName: string | null; createdAt: string };
type MenuCat = { id: string; name: string; image: string | null };
type MenuProd = { id: string; name: string; price: number; categoryId: string; images: string | null };
type Card = { number: string | null; holder: string | null };

// Mahsulot rasmlari JSON'idan birinchisini oladi
function firstImg(images: string | null): string | null {
  const arr = parseJson<string[]>(images || "[]", []);
  return arr[0] || null;
}

// ─── Ofitsant POS paneli ───
export function WaiterPanel({
  restaurantName,
  staffName,
  staffId,
  currency,
}: {
  restaurantName: string;
  staffName: string;
  staffId: string;
  currency: string;
}) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [calls, setCalls] = useState<SvcCall[]>([]);
  const [ready, setReady] = useState<ReadyOrder[]>([]);
  const [stats, setStats] = useState({ active: 0, sales: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastCallRef = useRef(0);
  const lastReadyRef = useRef(0);
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
      const [tRes, cRes, rRes] = await Promise.all([
        fetch("/api/staff/tables"),
        fetch("/api/service"),
        fetch("/api/orders?status=READY&limit=50"),
      ]);
      const t = await tRes.json();
      const c = await cRes.json();
      const r = await rRes.json();
      if (t.success) {
        setTables(t.data.tables);
        setStats({ active: t.data.activeCount, sales: t.data.todaySales, orders: t.data.todayOrders });
      }
      if (c.success) {
        const list: SvcCall[] = c.data;
        if (!first.current && list.length > lastCallRef.current && soundRef.current) beep();
        lastCallRef.current = list.length;
        setCalls(list);
      }
      if (r.success) {
        const list: ReadyOrder[] = r.data.orders;
        // Yangi "tayyor" buyurtma paydo bo'lsa — ovoz
        if (!first.current && list.length > lastReadyRef.current && soundRef.current) beep();
        lastReadyRef.current = list.length;
        setReady(list);
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

  async function resolveCall(id: string) {
    setCalls((p) => p.filter((c) => c.id !== id));
    await fetch(`/api/service/${id}`, { method: "PATCH" }).catch(() => {});
    load();
  }
  // Ofitsant tayyor taomni stolga oborib berdi → DELIVERED
  async function deliver(id: string) {
    setBusyId(id);
    setReady((p) => p.filter((o) => o.id !== id));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    }).catch(() => {});
    setBusyId(null);
    load();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
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
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${soundOn ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-muted"}`}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button onClick={logout} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-error">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-4 sm:px-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : (
          <>
            {/* Salom + statistika */}
            <div className="mb-4">
              <h1 className="text-lg font-bold text-foreground">Salom, {staffName} 👋</h1>
              <p className="mt-0.5 text-sm text-muted">Stolni bosing → taom qo'shing → oshxonaga yuboring → to'lov</p>
            </div>

            {/* TAYYOR — yetkazish kerak (oshxona tayyorlab bo'ldi) */}
            {ready.length > 0 && (
              <div className="mb-4 rounded-2xl border-2 border-success/50 bg-success/5 p-3">
                <p className="mb-2.5 flex items-center gap-1.5 px-0.5 text-sm font-bold text-success">
                  <BellRing className="h-4 w-4" /> Tayyor — stolga yetkazing ({ready.length})
                </p>
                <div className="space-y-2.5">
                  {[...ready]
                    .sort((a, b) => Number(b.staffId === staffId) - Number(a.staffId === staffId))
                    .map((o) => {
                      const items = parseJson<OrderItem[]>(o.items, []);
                      const mine = o.staffId === staffId;
                      return (
                        <div key={o.id} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-foreground">{o.tableName || "Zalda"}</span>
                              <span className="text-xs text-muted">#{o.number}</span>
                              {mine && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">Siz qabul qilgan</span>}
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                              <Check className="h-3 w-3" /> Tayyor
                            </span>
                          </div>
                          <p className="mt-1.5 flex flex-wrap gap-x-2.5 text-sm text-foreground">
                            {items.map((it, i) => (
                              <span key={i}><b className="text-accent">{it.qty}×</b> {it.name}</span>
                            ))}
                          </p>
                          <button
                            disabled={busyId === o.id}
                            onClick={() => deliver(o.id)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-success py-2.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                          >
                            {busyId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Oborib berdim
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <StatBox label="Faol stol" value={String(stats.active)} icon={Armchair} />
              <StatBox label="Bugungi savdo" value={formatPrice(stats.sales, currency)} icon={Coins} highlight />
              <StatBox label="Buyurtmam" value={String(stats.orders)} icon={Receipt} />
            </div>

            {/* Chaqiruvlar */}
            {calls.length > 0 && (
              <div className="mb-4 space-y-2">
                {calls.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between gap-3 rounded-xl border-2 bg-card p-3 shadow-soft ${c.type === "WAITER" ? "border-warning/50" : "border-accent/50"}`}>
                    <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.type === "WAITER" ? "bg-warning/15 text-warning" : "bg-accent-soft text-accent"}`}>
                        {c.type === "WAITER" ? <Bell className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                      </span>
                      {c.tableName || "Stol"} — {c.type === "WAITER" ? "chaqirmoqda" : "hisob"}
                    </span>
                    <button onClick={() => resolveCall(c.id)} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white active:scale-95">
                      {c.type === "WAITER" ? "Bordim" : "Berildi"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Stollar */}
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Armchair className="h-4 w-4" /> Stollar
            </p>
            {tables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted">
                Stollar yo'q. Egasi QR bo'limida stol qo'shadi.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {tables.map((t) => (
                  <TableCard key={t.id} table={t} currency={currency} onOpen={() => setOpenCode(t.code)} />
                ))}
              </div>
            )}
            <Legend />
          </>
        )}
      </main>

      {openCode && (
        <TableDetail code={openCode} currency={currency} onClose={() => { setOpenCode(null); load(); }} />
      )}
    </div>
  );
}

// ─── Stol kartasi ───
const STATUS_STYLE: Record<string, { ring: string; dot: string; label: string; bg: string; icon: string; badge: string }> = {
  FREE: { ring: "border-success/30", dot: "bg-success", label: "Bo'sh", bg: "bg-card", icon: "text-success/60", badge: "text-success" },
  ACTIVE: { ring: "border-error/50", dot: "bg-error", label: "Band", bg: "bg-error/5", icon: "text-error", badge: "text-error" },
  BILL: { ring: "border-warning/50", dot: "bg-warning", label: "To'lov", bg: "bg-warning/5", icon: "text-warning", badge: "text-warning" },
};

function TableCard({ table, currency, onOpen }: { table: TableRow; currency: string; onOpen: () => void }) {
  const s = STATUS_STYLE[table.status] || STATUS_STYLE.FREE;
  const busy = table.status !== "FREE";
  return (
    <button
      onClick={onOpen}
      className={`relative flex min-h-[104px] flex-col items-center justify-center rounded-2xl border-2 p-2.5 shadow-soft transition active:scale-95 ${s.ring} ${s.bg}`}
    >
      {busy && table.orders > 0 && (
        <span className={`absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${table.status === "BILL" ? "bg-warning" : "bg-error"}`}>
          {table.orders}
        </span>
      )}
      <Armchair className={`h-7 w-7 ${s.icon}`} />
      <span className="mt-1 text-base font-bold leading-none text-foreground">{table.name}</span>
      {/* Holat har doim so'z bilan — bir qarashda tushunarli */}
      <span className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
      </span>
      {busy && <span className="text-[11px] font-medium text-foreground">{formatPrice(table.total, currency)}</span>}
    </button>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Bo'sh</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error" /> Buyurtma bor</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> To'lov kutilmoqda</span>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: typeof Bell; highlight?: boolean }) {
  if (highlight) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-hover p-3 text-white shadow-md">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
          <Icon className="h-4 w-4" />
        </span>
        <p className="mt-2 text-sm font-extrabold leading-tight">{value}</p>
        <p className="text-[11px] opacity-90">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-sm font-bold leading-tight text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

// ─── Stol tafsiloti (hisob + taom qo'shish + to'lov) ───
function TableDetail({ code, currency, onClose }: { code: string; currency: string; onClose: () => void }) {
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [tableName, setTableName] = useState("");
  const [total, setTotal] = useState(0);
  const [card, setCard] = useState<Card>({ number: null, holder: null });
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [pay, setPay] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/table/${code}`);
    const json = await res.json();
    if (json.success) {
      setOrders(json.data.orders);
      setTableName(json.data.table.name);
      setTotal(json.data.total);
      setCard(json.data.card);
    }
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  // Barcha buyurtma taomlarini birlashtiramiz
  const allItems: OrderItem[] = orders.flatMap((o) => parseJson<OrderItem[]>(o.items, []));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <header className="sticky top-0 flex items-center gap-3 border-b border-border bg-card px-3 py-3">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-foreground">{tableName || "Stol"}</p>
          <p className="text-xs text-muted">{orders.length} ta buyurtma</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : allItems.length === 0 ? (
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Utensils className="h-8 w-8" />
            </span>
            <p className="mt-4 font-semibold text-foreground">Stol bo'sh</p>
            <p className="mt-1 text-sm text-muted">Mijoz tanlagan taomlarni qo'shing va oshxonaga yuboring.</p>
            <button
              onClick={() => setPicker(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-semibold text-white active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" /> Taom qo'shish
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-lg space-y-3">
            {orders.map((o) => {
              const items = parseJson<OrderItem[]>(o.items, []);
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                    <span>#{o.number}{o.waiterName ? ` · ${o.waiterName}` : ""}</span>
                    <StatusChip status={o.status} />
                  </div>
                  <ul className="space-y-1">
                    {items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-2 text-sm">
                        <span className="text-foreground">
                          <b className="text-accent">{it.qty}×</b> {it.name}
                          {it.comment ? <span className="block text-[11px] text-warning">↳ {it.comment}</span> : null}
                        </span>
                        <span className="shrink-0 text-foreground">{formatPrice(it.price * it.qty, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pastki panel — katta, aniq tugmalar */}
      <div className="border-t border-border bg-card px-3 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-sm text-muted">Jami hisob</span>
            <span className="text-2xl font-extrabold text-foreground">{formatPrice(total, currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPicker(true)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-accent/40 bg-accent-soft py-3.5 text-[15px] font-semibold text-accent active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" /> Taom qo'shish
            </button>
            <button
              onClick={() => setPay(true)}
              disabled={total <= 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-40"
            >
              <Wallet className="h-5 w-5" /> To'lov
            </button>
          </div>
        </div>
      </div>

      {picker && <MenuPicker code={code} currency={currency} onClose={() => setPicker(false)} onSent={() => { setPicker(false); load(); }} />}
      {pay && <PaymentModal code={code} total={total} card={card} currency={currency} onClose={() => setPay(false)} onPaid={() => { setPay(false); onClose(); }} />}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    NEW: { label: "Yangi", cls: "bg-accent-soft text-accent" },
    ACCEPTED: { label: "Qabul", cls: "bg-warning/10 text-warning" },
    PREPARING: { label: "Tayyorlanmoqda", cls: "bg-warning/10 text-warning" },
    READY: { label: "Tayyor", cls: "bg-success/10 text-success" },
    DELIVERED: { label: "Yetkazildi", cls: "bg-surface-2 text-muted" },
  };
  const m = map[status] || map.NEW;
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>{m.label}</span>;
}

// ─── Taom tanlash (menyu) ───
type Draft = { productId: string; name: string; price: number; qty: number; comment: string };

function MenuPicker({ code, currency, onClose, onSent }: { code: string; currency: string; onClose: () => void; onSent: () => void }) {
  const [cats, setCats] = useState<MenuCat[]>([]);
  const [prods, setProds] = useState<MenuProd[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/staff/menu").then((r) => r.json()).then((j) => {
      if (j.success) {
        setCats(j.data.categories);
        setProds(j.data.products);
        // Default: "Barchasi" (bo'sh) — mahsulotlar doim ko'rinadi
        setActiveCat("");
      }
      setLoading(false);
    });
  }, []);

  const shown = q.trim()
    ? prods.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : activeCat
    ? prods.filter((p) => p.categoryId === activeCat)
    : prods; // "Barchasi"

  function add(p: MenuProd) {
    setDraft((d) => {
      const ex = d.find((x) => x.productId === p.id);
      if (ex) return d.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...d, { productId: p.id, name: p.name, price: p.price, qty: 1, comment: "" }];
    });
  }
  function setQty(id: string, qty: number) {
    setDraft((d) => (qty <= 0 ? d.filter((x) => x.productId !== id) : d.map((x) => (x.productId === id ? { ...x, qty } : x))));
  }
  function setComment(id: string, comment: string) {
    setDraft((d) => d.map((x) => (x.productId === id ? { ...x, comment } : x)));
  }

  const draftTotal = draft.reduce((s, x) => s + x.price * x.qty, 0);
  const draftCount = draft.reduce((s, x) => s + x.qty, 0);

  async function send() {
    if (draft.length === 0) return;
    setSending(true);
    const res = await fetch("/api/staff/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableCode: code,
        items: draft.map((x) => ({ productId: x.productId, qty: x.qty, comment: x.comment || undefined })),
      }),
    });
    setSending(false);
    if (res.ok) onSent();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-3">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted">
          <X className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Taom qidirish..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      </header>

      {/* Kategoriya chiplari */}
      {!q.trim() && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-card px-3 py-2">
          <button
            onClick={() => setActiveCat("")}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeCat === "" ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}
          >
            Barchasi
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeCat === c.id ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted">
            <Utensils className="h-10 w-10 text-muted/40" />
            <p className="mt-3 text-sm">Bu bo'limda taom yo'q</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shown.map((p) => {
              const inDraft = draft.find((x) => x.productId === p.id);
              const img = firstImg(p.images);
              return (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  className={`group relative overflow-hidden rounded-2xl border-2 bg-card text-left shadow-soft transition active:scale-95 ${inDraft ? "border-accent" : "border-border"}`}
                >
                  {/* Rasm */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted/40">
                        <Utensils className="h-8 w-8" />
                      </div>
                    )}
                    {inDraft && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white shadow-md">
                        {inDraft.qty}
                      </span>
                    )}
                    {/* qo'shish belgisi */}
                    <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-accent shadow-md">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                  {/* Matn */}
                  <div className="p-2.5">
                    <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">{p.name}</p>
                    <p className="mt-1 text-sm font-bold text-accent">{formatPrice(p.price, currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Draft (tanlangan taomlar) */}
      {draft.length > 0 && (
        <div className="max-h-[42vh] overflow-y-auto border-t border-border bg-card px-3 py-3">
          <div className="mx-auto max-w-lg space-y-2">
            {draft.map((x) => (
              <div key={x.productId} className="rounded-xl bg-surface-2 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{x.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setQty(x.productId, x.qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-foreground"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-6 text-center text-sm font-bold tabular-nums text-foreground">{x.qty}</span>
                    <button onClick={() => setQty(x.productId, x.qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-foreground"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <input
                  value={x.comment}
                  onChange={(e) => setComment(x.productId, e.target.value)}
                  placeholder="Izoh (masalan: achchiqroq, go'shtsiz)"
                  className="mt-2 h-8 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yuborish */}
      <div className="border-t border-border bg-card px-3 py-3">
        <button
          onClick={send}
          disabled={draft.length === 0 || sending}
          className="mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
          Oshxonaga yuborish {draftCount > 0 && `· ${draftCount} ta · ${formatPrice(draftTotal, currency)}`}
        </button>
      </div>
    </div>
  );
}

// ─── To'lov ───
function PaymentModal({ code, total, card, currency, onClose, onPaid }: { code: string; total: number; card: Card; currency: string; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<"CASH" | "CARD" | "MIXED" | null>(null);
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const cashNum = Math.max(0, Number(cash.replace(/\D/g, "")) || 0);
  const cardNum = Math.max(0, total - cashNum);

  async function pay() {
    setError("");
    setBusy(true);
    const bodyData: Record<string, unknown> = { tableCode: code, method };
    if (method === "MIXED") { bodyData.cash = cashNum; bodyData.card = cardNum; }
    const res = await fetch("/api/staff/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || "To'lov amalga oshmadi"); return; }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={done ? onPaid : onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 animate-fade-up sm:rounded-3xl">
        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-9 w-9" /></div>
            <h2 className="mt-4 text-xl font-bold text-foreground">To'lov qabul qilindi!</h2>
            <p className="mt-1 text-muted">{formatPrice(total, currency)} · {method === "CASH" ? "Naqd" : method === "CARD" ? "Karta" : "Aralash"}</p>
            <button onClick={onPaid} className="mt-6 rounded-xl bg-accent px-6 py-2.5 font-semibold text-white">Yopish</button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">To'lov</h2>
              <button onClick={onClose} className="text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-4 rounded-xl bg-surface-2 p-4 text-center">
              <p className="text-xs text-muted">To'lov summasi</p>
              <p className="text-3xl font-extrabold text-foreground">{formatPrice(total, currency)}</p>
            </div>

            {/* Usul tanlash */}
            <div className="grid grid-cols-3 gap-2">
              <MethodBtn active={method === "CASH"} onClick={() => setMethod("CASH")} icon={Coins} label="Naqd" />
              <MethodBtn active={method === "CARD"} onClick={() => setMethod("CARD")} icon={CreditCard} label="Karta" />
              <MethodBtn active={method === "MIXED"} onClick={() => setMethod("MIXED")} icon={Wallet} label="Aralash" />
            </div>

            {/* Karta ma'lumoti */}
            {(method === "CARD" || method === "MIXED") && (
              <div className="mt-4">
                {card.number ? (
                  <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-accent to-accent-hover px-3.5 py-3 text-white shadow-md">
                    <CreditCard className="h-5 w-5 shrink-0 opacity-80" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold tracking-wider">{card.number}</p>
                      {card.holder && <p className="truncate text-xs uppercase opacity-90">{card.holder}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-warning/10 px-3 py-2.5 text-sm text-warning">
                    Karta kiritilmagan. Egasi sozlamalarda karta raqamini qo'shishi kerak.
                  </div>
                )}
              </div>
            )}

            {/* Aralash — naqd qismi */}
            {method === "MIXED" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">Naqd</label>
                  <input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="numeric" placeholder="0"
                    className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Karta (avto)</label>
                  <div className="flex h-11 items-center rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold text-foreground">
                    {formatPrice(cardNum, currency)}
                  </div>
                </div>
              </div>
            )}

            {error && <div className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>}

            <button
              onClick={pay}
              disabled={!method || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              To'lovni yakunlash
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MethodBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Bell; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-medium transition ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
