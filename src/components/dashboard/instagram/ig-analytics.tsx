"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, Reply, MousePointerClick, Percent, TrendingUp, Hash, Trophy } from "lucide-react";
import { Stat, Skeleton, EmptyState } from "@/components/ui";
import { IgChart, type IgDailyPoint } from "./ig-chart";
import { igGet } from "./client";

type Analytics = {
  totals: {
    comments: number;
    dms: number;
    replies: number;
    buttonClicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
    buttonClicksAllTime: number;
  };
  daily: IgDailyPoint[];
  topRules: { id: string; name: string; hitCount: number; enabled: boolean }[];
  topKeywords: { word: string; count: number }[];
  topPosts: { mediaId: string; count: number }[];
};

export function IgAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await igGet<Analytics>("/analytics"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (error)
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center text-sm text-error">
        {error}
      </div>
    );

  const t = data!.totals;
  const cards = [
    { label: "Comment (30 kun)", value: t.comments, icon: MessageCircle },
    { label: "DM (30 kun)", value: t.dms, icon: Send },
    { label: "Reply (30 kun)", value: t.replies, icon: Reply },
    { label: "Tugma bosildi", value: t.buttonClicks, icon: MousePointerClick },
    { label: "CTR", value: `${t.ctr}%`, icon: TrendingUp },
    { label: "Konversiya", value: `${t.conversionRate}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Stat key={c.label} label={c.label} value={c.value} icon={c.icon} />
        ))}
      </div>

      <IgChart data={data!.daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top qoidalar */}
        <Panel title="Top qoidalar" icon={Trophy}>
          {data!.topRules.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
          ) : (
            <ul className="space-y-2">
              {data!.topRules.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-muted">
                      {i + 1}
                    </span>
                    <span className="truncate text-foreground">{r.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-foreground">{r.hitCount}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Top keyword'lar */}
        <Panel title="Eng ko'p ishlatilgan keyword" icon={Hash}>
          {data!.topKeywords.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data!.topKeywords.map((k) => (
                <span
                  key={k.word}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-foreground"
                >
                  {k.word}
                  <span className="rounded bg-accent-soft px-1.5 text-xs font-semibold text-accent">
                    {k.count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
