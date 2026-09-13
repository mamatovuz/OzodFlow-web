"use client";

import { useEffect, useState, useCallback } from "react";
import { Table2, Bell, Receipt, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui";
import { formatPrice, cn } from "@/lib/utils";

type TableCell = {
  id: string;
  name: string;
  code: string;
  status: string; // EMPTY | NEW | PREPARING | READY | WAITER | BILL
  orderCount: number;
  activeCount: number;
  total: number;
  lastOrderAt: string | null;
  calls: { id: string; type: string }[];
};

// Status → ko'rinish (dizayn tokenlari bilan)
const META: Record<string, { label: string; tile: string; dot: string }> = {
  EMPTY: { label: "Bo'sh", tile: "border-border bg-surface-2 text-muted", dot: "bg-success" },
  NEW: { label: "Yangi buyurtma", tile: "border-accent/40 bg-accent-soft text-accent", dot: "bg-accent" },
  PREPARING: { label: "Tayyorlanmoqda", tile: "border-warning/40 bg-warning/10 text-warning", dot: "bg-warning" },
  READY: { label: "Tayyor", tile: "border-success/40 bg-success/10 text-success", dot: "bg-success" },
  WAITER: { label: "Chaqirmoqda", tile: "border-error/50 bg-error/10 text-error", dot: "bg-error" },
  BILL: { label: "Hisob so'radi", tile: "border-accent/50 bg-accent-soft text-accent", dot: "bg-accent" },
};

const LEGEND = ["EMPTY", "NEW", "PREPARING", "READY", "WAITER", "BILL"];

export function TableMap({ currency }: { currency: string }) {
  const [cells, setCells] = useState<TableCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tablemap");
      const json = await res.json();
      if (json.success) setCells(json.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </Card>
    );
  }

  if (cells.length === 0) {
    return (
      <Card className="py-10 text-center">
        <Table2 className="mx-auto h-8 w-8 text-muted/40" />
        <p className="mt-2 text-sm text-muted">Stol qo'shilmagan. QR bo'limida stol qo'shing.</p>
      </Card>
    );
  }

  const selected = sel ? cells.find((c) => c.id === sel) ?? null : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Table2 className="h-4 w-4 text-accent" /> Stollar xaritasi
          <span className="flex items-center gap-1 text-xs font-normal text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            jonli
          </span>
        </h3>
        <button onClick={load} title="Yangilash" className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {LEGEND.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={cn("h-2 w-2 rounded-full", META[k].dot)} /> {META[k].label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {cells.map((c) => {
          const m = META[c.status] ?? META.EMPTY;
          const hasCall = c.calls.length > 0;
          return (
            <button
              key={c.id}
              onClick={() => setSel(sel === c.id ? null : c.id)}
              className={cn(
                "relative aspect-square rounded-xl border-2 p-2 text-center transition-all active:scale-95",
                m.tile,
                sel === c.id ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""
              )}
              title={m.label}
            >
              {hasCall && (
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                </span>
              )}
              <span className="flex h-full flex-col items-center justify-center">
                <span className="truncate text-sm font-bold leading-tight">{c.name}</span>
                {c.status !== "EMPTY" && c.total > 0 && (
                  <span className="mt-0.5 text-[10px] font-medium opacity-80">
                    {c.total >= 1000 ? `${Math.round(c.total / 1000)}k` : c.total}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tanlangan stol tafsiloti */}
      {selected && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", (META[selected.status] ?? META.EMPTY).dot)} />
              <span className="font-semibold text-foreground">{selected.name}</span>
              <span className="text-xs text-muted">{(META[selected.status] ?? META.EMPTY).label}</span>
            </div>
            {selected.calls.map((call) => (
              <span
                key={call.id}
                className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error"
              >
                {call.type === "WAITER" ? <Bell className="h-3 w-3" /> : <Receipt className="h-3 w-3" />}
                {call.type === "WAITER" ? "Ofitsant chaqirdi" : "Hisob so'radi"}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Detail label="Faol buyurtma" value={String(selected.activeCount)} />
            <Detail label="Bugungi buyurtma" value={String(selected.orderCount)} />
            <Detail label="Bugungi summa" value={formatPrice(selected.total, currency)} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
