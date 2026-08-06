"use client";

import { useMemo, useState } from "react";

export type IgDailyPoint = {
  date: string;
  comments: number;
  dms: number;
  replies: number;
  buttonClicks: number;
  newFollowers: number;
  conversions: number;
};

const METRICS: { key: keyof Omit<IgDailyPoint, "date">; label: string; color: string }[] = [
  { key: "comments", label: "Comment", color: "#DD2A7B" },
  { key: "dms", label: "DM", color: "#2563EB" },
  { key: "replies", label: "Reply", color: "#16A34A" },
  { key: "conversions", label: "Konversiya", color: "#F58529" },
];

export function IgChart({ data }: { data: IgDailyPoint[] }) {
  const [metric, setMetric] = useState<keyof Omit<IgDailyPoint, "date">>("comments");
  const active = METRICS.find((m) => m.key === metric)!;

  const max = useMemo(() => Math.max(1, ...data.map((d) => Number(d[metric]))), [data, metric]);
  const hasData = data.some((d) => Number(d[metric]) > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Oxirgi 30 kun</h3>
          <p className="text-xs text-muted">Kunlik faollik dinamikasi</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={
                metric === m.key
                  ? { background: m.color + "1a", color: m.color }
                  : undefined
              }
            >
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
              <span className={metric === m.key ? "" : "text-muted"}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted">
          Hozircha ma'lumot yo'q
        </div>
      ) : (
        <div className="flex h-48 items-stretch gap-[3px]">
          {data.map((d) => {
            const val = Number(d[metric]);
            const h = Math.max((val / max) * 100, val > 0 ? 4 : 0);
            return (
              <div key={d.date} className="group relative flex flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t transition-all"
                  style={{ height: `${h}%`, background: active.color, opacity: 0.85 }}
                />
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background group-hover:block">
                  {formatDay(d.date)}: {val}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>{formatDay(data[0]?.date)}</span>
        <span>{formatDay(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatDay(iso?: string): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}
