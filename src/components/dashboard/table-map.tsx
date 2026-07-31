"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Bell, CreditCard, Clock, X, RefreshCw } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

type Cell = {
  id: string;
  name: string;
  code: string;
  status: string;
  orderCount: number;
  activeCount: number;
  total: number;
  lastOrderAt: string | null;
  calls: { id: string; type: string }[];
};

const STATUS: Record<string, { label: string; bg: string; text: string; blink?: boolean }> = {
  EMPTY: { label: "Bo'sh", bg: "bg-success/15", text: "text-success" },
  WAITER: { label: "Ofitsiant chaqirilgan", bg: "bg-warning/20", text: "text-warning", blink: true },
  BILL: { label: "Hisob so'ralgan", bg: "bg-accent-soft", text: "text-accent", blink: true },
  PREPARING: { label: "Tayyorlanmoqda", bg: "bg-warning/15", text: "text-warning" },
  READY: { label: "Tayyor", bg: "bg-[#8b5cf6]/15", text: "text-[#8b5cf6]" },
  NEW: { label: "Yangi buyurtma", bg: "bg-error/15", text: "text-error", blink: true },
};

export function TableMap() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Cell | null>(null);
  const soundRef = useRef(true);
  const prevCalls = useRef(0);

  const beep = useCallback(() => {
    if (!soundRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 760;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.stop(ctx.currentTime + 0.4);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/tablemap");
    const json = await res.json();
    if (json.success) {
      const data: Cell[] = json.data;
      const totalCalls = data.reduce((s, c) => s + c.calls.length, 0);
      if (totalCalls > prevCalls.current) beep();
      prevCalls.current = totalCalls;
      setCells(data);
      setDetail((d) => (d ? data.find((c) => c.id === d.id) ?? null : null));
    }
    setLoading(false);
  }, [beep]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  async function resolve(callId: string) {
    await fetch(`/api/service/${callId}`, { method: "PATCH" });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <Card className="py-16 text-center text-sm text-muted">
        Stol yo'q. Avval stollar bo'limida stol qo'shing.
      </Card>
    );
  }

  return (
    <div>
      {/* Legenda */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        {Object.entries(STATUS).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${s.bg}`} />
            {s.label}
          </span>
        ))}
        <button onClick={load} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((c) => {
          const s = STATUS[c.status] || STATUS.EMPTY;
          return (
            <button
              key={c.id}
              onClick={() => setDetail(c)}
              className={`rounded-2xl border border-border p-4 text-left transition-all hover:shadow-card ${s.bg} ${
                s.blink ? "animate-pulse" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{c.name}</span>
                <div className="flex gap-1">
                  {c.calls.some((x) => x.type === "WAITER") && <Bell className="h-4 w-4 text-warning" />}
                  {c.calls.some((x) => x.type === "BILL") && <CreditCard className="h-4 w-4 text-accent" />}
                </div>
              </div>
              <p className={`mt-1 text-xs font-medium ${s.text}`}>{s.label}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{c.orderCount} buyurtma</span>
                <span className="font-semibold text-foreground">{formatPrice(c.total, "UZS")}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-2xl bg-card p-6 shadow-card animate-fade-up sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className={`mt-1 text-sm font-medium ${(STATUS[detail.status] || STATUS.EMPTY).text}`}>
              {(STATUS[detail.status] || STATUS.EMPTY).label}
            </p>

            {detail.calls.length > 0 && (
              <div className="mt-4 space-y-2">
                {detail.calls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      {call.type === "WAITER" ? <Bell className="h-4 w-4 text-warning" /> : <CreditCard className="h-4 w-4 text-accent" />}
                      {call.type === "WAITER" ? "Ofitsiant chaqirilgan" : "Hisob so'ralgan"}
                    </span>
                    <Button size="sm" onClick={() => resolve(call.id)}>
                      {call.type === "WAITER" ? "Borayapman" : "Hisob berildi"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <p className="text-xs text-muted">Buyurtma</p>
                <p className="font-bold text-foreground">{detail.orderCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Faol</p>
                <p className="font-bold text-foreground">{detail.activeCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Summa</p>
                <p className="font-bold text-foreground">{formatPrice(detail.total, "UZS")}</p>
              </div>
            </div>
            {detail.lastOrderAt && (
              <p className="mt-3 flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" /> Oxirgi: {new Date(detail.lastOrderAt).toLocaleString("uz-UZ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
