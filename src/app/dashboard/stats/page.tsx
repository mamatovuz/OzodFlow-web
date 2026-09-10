import {
  QrCode,
  TrendingUp,
  Eye,
  ShoppingBag,
  Wallet,
  Receipt,
  Clock,
  Table2,
  Trophy,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import {
  getDashboardStats,
  getTopProducts,
  getMostOrdered,
  getPeakHours,
  getTableStats,
} from "@/lib/stats";
import { formatPrice } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const cur = restaurant.currency;

  const [stats, top, ordered, peak, tables] = await Promise.all([
    getDashboardStats(restaurant.id),
    getTopProducts(restaurant.id, 8),
    getMostOrdered(restaurant.id, 8),
    getPeakHours(restaurant.id),
    getTableStats(restaurant.id),
  ]);

  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);
  const maxRev = Math.max(...stats.daily.map((d) => d.revenue), 1);
  const maxViews = Math.max(...top.map((p) => p.views), 1);
  const maxOrdered = Math.max(...ordered.map((p) => p.qty), 1);
  const maxHour = Math.max(...peak.hours, 1);
  const bestTable = tables.find((t) => t.orders > 0 || t.scans > 0) || null;

  // Asosiy savdo KPIlari
  const kpis = [
    { label: "Bugungi savdo", value: formatPrice(stats.todayRevenue, cur), icon: Wallet, accent: true },
    { label: "Buyurtmalar (bugun)", value: String(stats.todayOrders), icon: ShoppingBag },
    { label: "O'rtacha chek", value: formatPrice(stats.avgCheck, cur), icon: Receipt },
    { label: "Bugungi skan", value: String(stats.todayScans), icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistika</h1>
        <p className="mt-1 text-sm text-muted">
          Savdo, mijozlar va menyu ko'rsatkichlari — real vaqtda
        </p>
      </div>

      {/* Asosiy KPI kartochkalari */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <Card
            key={c.label}
            className={`relative overflow-hidden p-5 ${c.accent ? "border-accent/40" : ""}`}
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                c.accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
              }`}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="mt-0.5 text-sm text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Ikkinchi qator — davr bo'yicha savdo + naqd/karta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Haftalik savdo" value={formatPrice(stats.weekRevenue, cur)} />
        <MiniStat label="Oylik savdo" value={formatPrice(stats.monthRevenue, cur)} />
        <MiniStat label="Bugun — naqd" value={formatPrice(stats.todayCash, cur)} />
        <MiniStat label="Bugun — karta" value={formatPrice(stats.todayCard, cur)} />
      </div>

      {/* Haftalik dinamika — skaner + daromad */}
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Haftalik dinamika</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent/80" /> Skaner
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-success/80" /> Savdo
            </span>
          </div>
        </div>
        <div className="flex h-48 items-stretch justify-between gap-2">
          {stats.daily.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end gap-1">
                <div
                  style={{ height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 6 : 2)}%` }}
                  className="w-1/2 min-h-[4px] rounded-t-md bg-accent/80"
                  title={`${d.count} skaner`}
                />
                <div
                  style={{ height: `${Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 6 : 2)}%` }}
                  className="w-1/2 min-h-[4px] rounded-t-md bg-success/80"
                  title={formatPrice(d.revenue, cur)}
                />
              </div>
              <span className="text-xs text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Eng ko'p ko'rilgan / eng ko'p buyurtma qilingan */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-foreground">Eng ko'p ko'rilgan</h2>
          </div>
          <RankList
            rows={top.map((p) => ({ name: p.name, value: p.views, max: maxViews }))}
            empty="Hali ko'rishlar yo'q"
            suffix=""
          />
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-foreground">Eng ko'p buyurtma qilingan</h2>
          </div>
          <RankList
            rows={ordered.map((p) => ({ name: p.name, value: p.qty, max: maxOrdered }))}
            empty="Hali buyurtma yo'q"
            suffix=" ta"
          />
        </Card>
      </div>

      {/* Faol soat + eng faol stol */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Clock className="h-4 w-4 text-accent" /> Eng faol vaqt
            </h2>
            <Badge variant="accent">{peak.label}</Badge>
          </div>
          {/* 24 soatlik mini-grafik */}
          <div className="flex h-24 items-end gap-[3px]">
            {peak.hours.map((h, i) => (
              <div
                key={i}
                title={`${String(i).padStart(2, "0")}:00 — ${h}`}
                style={{ height: `${Math.max((h / maxHour) * 100, h > 0 ? 5 : 2)}%` }}
                className="flex-1 rounded-sm bg-accent/70"
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Table2 className="h-4 w-4 text-accent" /> Eng faol stol
          </h2>
          {bestTable ? (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl font-bold text-accent">
                {bestTable.name.replace(/\D/g, "") || bestTable.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground">{bestTable.name}</p>
                <p className="text-sm text-muted">
                  {bestTable.scans} skaner · {bestTable.orders} buyurtma
                </p>
                <p className="mt-0.5 text-sm font-semibold text-accent">
                  {formatPrice(bestTable.revenue, cur)}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              Hali stol statistikasi yo'q
            </p>
          )}
        </Card>
      </div>

      {/* Har bir QR/stol bo'yicha statistika */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <QrCode className="h-4 w-4 text-accent" /> Har bir stol (QR) bo'yicha
        </h2>
        {tables.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Stol qo'shilmagan. QR bo'limida stol qo'shsangiz — har biri alohida kuzatiladi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Stol</th>
                  <th className="pb-2 text-right font-medium">Skaner</th>
                  <th className="pb-2 text-right font-medium">Buyurtma</th>
                  <th className="pb-2 text-right font-medium">Daromad (30 kun)</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{t.name}</td>
                    <td className="py-2.5 text-right text-muted">{t.scans}</td>
                    <td className="py-2.5 text-right text-muted">{t.orders}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">
                      {formatPrice(t.revenue, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function RankList({
  rows,
  empty,
  suffix,
}: {
  rows: { name: string; value: number; max: number }[];
  empty: string;
  suffix: string;
}) {
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  }
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.name + i} className="flex items-center gap-3">
          <span className="w-6 text-center text-sm">
            {medal[i] ?? <span className="text-muted">{i + 1}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
            <div className="mt-1 h-1.5 rounded-full bg-surface-2">
              <div
                style={{ width: `${(r.value / r.max) * 100}%` }}
                className="h-full rounded-full bg-accent"
              />
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-muted">
            {r.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
