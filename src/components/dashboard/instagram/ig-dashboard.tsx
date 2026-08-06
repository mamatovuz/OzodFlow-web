"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Send,
  Reply,
  UserPlus,
  MousePointerClick,
  Percent,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Stat, Skeleton } from "@/components/ui";
import { IgAccountCard, type IgAccount } from "./ig-account-card";
import { IgChart, type IgDailyPoint } from "./ig-chart";
import { igGet } from "./client";

type Overview = {
  configured: boolean;
  account: IgAccount | null;
  today: {
    comments: number;
    dms: number;
    replies: number;
    buttonClicks: number;
    newFollowers: number;
    conversions: number;
    conversionRate: number;
  };
  ruleCount: number;
  activeRules: number;
};

export function IgDashboard() {
  const params = useSearchParams();
  const [data, setData] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<IgDailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ov, st] = await Promise.all([
        igGet<Overview>(""),
        igGet<{ daily: IgDailyPoint[] }>("/stats?days=30"),
      ]);
      setData(ov);
      setDaily(st.daily);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // OAuth callback natijasi (?connect=ok|error)
  useEffect(() => {
    const c = params.get("connect");
    if (c === "ok") setNotice({ type: "ok", msg: "Instagram muvaffaqiyatli ulandi!" });
    else if (c === "error")
      setNotice({ type: "error", msg: params.get("msg") || "Ulashda xatolik yuz berdi" });
    if (c) window.history.replaceState({}, "", "/dashboard/instagram");
  }, [params]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
        <p className="text-sm text-error">{error}</p>
        <button onClick={load} className="mt-3 text-sm font-medium text-accent underline">
          Qayta urinish
        </button>
      </div>
    );
  }

  const t = data!.today;
  const cards = [
    { label: "Bugungi comment", value: t.comments, icon: MessageCircle },
    { label: "Bugungi DM", value: t.dms, icon: Send },
    { label: "Auto reply", value: t.replies, icon: Reply },
    { label: "Yangi follower", value: t.newFollowers, icon: UserPlus },
    { label: "Tugma bosildi", value: t.buttonClicks, icon: MousePointerClick },
    { label: "Konversiya", value: `${t.conversionRate}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            notice.type === "ok" ? "bg-success/10 text-success" : "bg-error/10 text-error"
          }`}
        >
          {notice.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {notice.msg}
        </div>
      )}

      <IgAccountCard account={data!.account} configured={data!.configured} onChange={load} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Stat key={c.label} label={c.label} value={c.value} icon={c.icon} />
        ))}
      </div>

      <IgChart data={daily} />
    </div>
  );
}
