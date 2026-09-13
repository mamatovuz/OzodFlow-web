"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { cn, formatPrice, formatCompact } from "@/lib/utils";
import type { SalesSeries, SalesPoint } from "@/lib/stats";

type Period = "today" | "week" | "month" | "year";
type Metric = "revenue" | "orders" | "avg";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "7 kun" },
  { key: "month", label: "30 kun" },
  { key: "year", label: "12 oy" },
];

const METRICS: { key: Metric; label: string }[] = [
  { key: "revenue", label: "Daromad" },
  { key: "orders", label: "Buyurtmalar" },
  { key: "avg", label: "O'rtacha chek" },
];

function pointValue(p: SalesPoint, metric: Metric): number {
  if (metric === "orders") return p.orders;
  if (metric === "avg") return p.orders > 0 ? Math.round(p.revenue / p.orders) : 0;
  return p.revenue;
}

export function SalesChart({ series, currency }: { series: SalesSeries; currency: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [hover, setHover] = useState<number | null>(null);

  const points = series[period];
  const values = useMemo(() => points.map((p) => pointValue(p, metric)), [points, metric]);
  const max = Math.max(...values, 1);
  const total = useMemo(
    () => points.reduce((s, p) => s + (metric === "orders" ? p.orders : p.revenue), 0),
    [points, metric]
  );
  const totalOrders = useMemo(() => points.reduce((s, p) => s + p.orders, 0), [points]);

  // O'qdagi umumiy ko'rsatkich (metrikaga qarab)
  const headline =
    metric === "orders"
      ? `${totalOrders} ta`
      : metric === "avg"
        ? formatPrice(totalOrders > 0 ? Math.round(total / totalOrders) : 0, currency)
        : formatPrice(total, currency);

  // Tooltip qiymati formati
  const fmt = (v: number) => (metric === "orders" ? `${v} ta` : formatPrice(v, currency));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-accent" /> Savdo tahlili
          </h3>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{headline}</p>
          <p className="text-xs text-muted">
            {METRICS.find((m) => m.key === metric)?.label} ·{" "}
            {PERIODS.find((p) => p.key === period)?.label}
          </p>
        </div>

        {/* Metrika almashtirgichi */}
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                metric === m.key ? "bg-card text-foreground shadow-soft" : "text-muted hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Davr almashtirgichi */}
      <div className="mt-4 inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => { setPeriod(p.key); setHover(null); }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              period === p.key ? "bg-card text-foreground shadow-soft" : "text-muted hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Grafik */}
      <div className="relative mt-6">
        {/* Tooltip */}
        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-3 py-2 text-center shadow-card"
            style={{ left: `${((hover + 0.5) / points.length) * 100}%` }}
          >
            <p className="text-[11px] text-muted">{points[hover].label}{period === "today" ? ":00" : ""}</p>
            <p className="text-sm font-bold text-foreground">{fmt(pointValue(points[hover], metric))}</p>
            {metric !== "orders" && (
              <p className="text-[11px] text-muted">{points[hover].orders} buyurtma</p>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex h-48 items-stretch gap-1",
            period === "month" || period === "today" ? "justify-between" : "justify-between"
          )}
        >
          {points.map((p, i) => {
            const v = pointValue(p, metric);
            const h = Math.max((v / max) * 100, v > 0 ? 4 : 1.5);
            const active = hover === i;
            return (
              <div
                key={i}
                className="group flex flex-1 flex-col items-center justify-end gap-2"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all",
                      active ? "bg-accent" : "bg-accent/70 group-hover:bg-accent"
                    )}
                    style={{ height: `${h}%`, minHeight: 4 }}
                  />
                </div>
                {/* 30 kun / 24 soatda har uchinchi belgini ko'rsatamiz — siqilib ketmasin */}
                {(points.length <= 12 || i % Math.ceil(points.length / 10) === 0) && (
                  <span className="text-[10px] leading-none text-muted">{p.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Y-o'q eng katta qiymat belgisi */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted">
          <span>Eng yuqori: {metric === "orders" ? `${max} ta` : formatPrice(max, currency)}</span>
          <span className="hidden sm:inline">{metric !== "orders" && `∑ ${formatCompact(total)}`}</span>
        </div>
      </div>
    </Card>
  );
}
