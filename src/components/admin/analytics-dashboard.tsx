"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Eye,
  QrCode,
  Store,
  UserPlus,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

type Period = "today" | "7d" | "30d" | "all";

type Data = {
  kpis: {
    siteVisits: number;
    uniqueVisitors: number;
    menuScans: number;
    uniqueMenuVisitors: number;
    newRestaurants: number;
    newUsers: number;
    orders: number;
    ordersRevenue: number;
    platformRevenue: number;
  };
  totals: { restaurants: number; users: number };
  chart: { date: string; visits: number; scans: number }[];
  plans: { plan: string; count: number }[];
  topPages: { path: string; count: number }[];
  topRestaurants: { id: string; name: string; slug: string; scans: number }[];
  recent: { id: string; name: string; slug: string; plan: string; createdAt: string }[];
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "7d", label: "7 kun" },
  { key: "30d", label: "30 kun" },
  { key: "all", label: "Hammasi" },
];

const PLAN_LABEL: Record<string, string> = {
  FREE: "Bepul",
  STARTER: "Starter",
  BUSINESS: "Business",
  PRO: "Pro",
  PROMAX: "Pro Max",
  ENTERPRISE: "Enterprise",
};

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(p: Period) {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?period=${p}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (json?.success) setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const maxBar = data
    ? Math.max(1, ...data.chart.map((d) => Math.max(d.visits, d.scans)))
    : 1;
  const totalPlans = data ? data.plans.reduce((s, p) => s + p.count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Davr tanlash */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                period === p.key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(period)}
          className="text-muted transition hover:text-foreground"
          title="Yangilash"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-2 py-20 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
        </div>
      ) : (
        <>
          {/* KPI kartalar */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={Eye}
              label="Sayt tashriflari"
              value={data.kpis.siteVisits.toLocaleString("uz")}
              sub={`${data.kpis.uniqueVisitors.toLocaleString("uz")} noyob mehmon`}
            />
            <Kpi
              icon={QrCode}
              label="Menyu ochilishi"
              value={data.kpis.menuScans.toLocaleString("uz")}
              sub={`${data.kpis.uniqueMenuVisitors.toLocaleString("uz")} noyob mijoz`}
            />
            <Kpi
              icon={Store}
              label="Yangi restoranlar"
              value={data.kpis.newRestaurants.toLocaleString("uz")}
              sub={`jami ${data.totals.restaurants.toLocaleString("uz")}`}
            />
            <Kpi
              icon={UserPlus}
              label="Yangi foydalanuvchilar"
              value={data.kpis.newUsers.toLocaleString("uz")}
              sub={`jami ${data.totals.users.toLocaleString("uz")}`}
            />
            <Kpi
              icon={ShoppingBag}
              label="Buyurtmalar"
              value={data.kpis.orders.toLocaleString("uz")}
            />
            <Kpi
              icon={TrendingUp}
              label="Buyurtma aylanmasi"
              value={formatPrice(data.kpis.ordersRevenue, "UZS")}
            />
            <Kpi
              icon={Wallet}
              label="Platforma tushumi"
              value={formatPrice(data.kpis.platformRevenue, "UZS")}
              accent
            />
            <Kpi
              icon={Users}
              label="Faol mehmonlar (noyob)"
              value={data.kpis.uniqueVisitors.toLocaleString("uz")}
            />
          </div>

          {/* Grafik */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Tashriflar dinamikasi</h2>
              <div className="flex items-center gap-4 text-xs text-muted">
                <Legend color="var(--accent, #2563EB)" label="Sayt tashriflari" />
                <Legend color="#94a3b8" label="Menyu ochilishi" />
              </div>
            </div>
            {data.chart.every((d) => d.visits === 0 && d.scans === 0) ? (
              <p className="py-10 text-center text-sm text-muted">
                Bu davr uchun ma'lumot hali yo'q
              </p>
            ) : (
              <div className="flex h-52 items-stretch gap-1.5">
                {data.chart.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                      <div
                        className="w-1/2 rounded-t bg-accent transition-all"
                        style={{ height: `${Math.max((d.visits / maxBar) * 100, d.visits ? 4 : 0)}%` }}
                        title={`${d.visits} tashrif`}
                      />
                      <div
                        className="w-1/2 rounded-t bg-slate-400 transition-all"
                        style={{ height: `${Math.max((d.scans / maxBar) * 100, d.scans ? 4 : 0)}%` }}
                        title={`${d.scans} menyu`}
                      />
                    </div>
                    <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top sahifalar */}
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-foreground">Eng ko'p ochilgan sahifalar</h2>
              {data.topPages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-2">
                  {data.topPages.map((p) => {
                    const max = data.topPages[0].count || 1;
                    return (
                      <div key={p.path} className="flex items-center gap-3">
                        <code className="w-40 shrink-0 truncate text-xs text-foreground">{p.path}</code>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${(p.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-sm font-medium text-foreground">
                          {p.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Top restoranlar */}
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-foreground">Eng faol restoranlar (menyu)</h2>
              {data.topRestaurants.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-2">
                  {data.topRestaurants.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                      </div>
                      <span className="shrink-0 text-sm text-muted">{r.scans} ochilish</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Tariflar taqsimoti */}
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-foreground">Tariflar bo'yicha</h2>
              <div className="space-y-3">
                {data.plans
                  .sort((a, b) => b.count - a.count)
                  .map((p) => (
                    <div key={p.plan} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-foreground">
                        {PLAN_LABEL[p.plan] || p.plan}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${totalPlans ? (p.count / totalPlans) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium text-foreground">
                        {p.count}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Oxirgi ro'yxatdan o'tganlar */}
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-foreground">Oxirgi qo'shilgan restoranlar</h2>
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-2">
                  {data.recent.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted">/{r.slug}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-accent">{PLAN_LABEL[r.plan] || r.plan}</p>
                        <p className="text-xs text-muted">
                          {new Date(r.createdAt).toLocaleDateString("uz")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
          accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
