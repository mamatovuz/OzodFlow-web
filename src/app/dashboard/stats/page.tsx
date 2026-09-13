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
  Timer,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import {
  getDashboardStats,
  getTopProducts,
  getMostOrdered,
  getPeakHours,
  getTableStats,
  getStaffLeaderboard,
  getSalesSeries,
} from "@/lib/stats";
import { formatPrice } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { SalesChart } from "@/components/dashboard/sales-chart";

// Bo'limlararo sticky navigatsiya — workspace hissi (§38). Silliq scroll globals.css'da.
const SECTIONS = [
  { id: "umumiy", label: "Umumiy" },
  { id: "savdo", label: "Savdo" },
  { id: "mahsulotlar", label: "Mahsulotlar" },
  { id: "xodimlar", label: "Xodimlar" },
  { id: "qr", label: "QR va stollar" },
];

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const cur = restaurant.currency;

  const [stats, top, ordered, peak, tables, staff, series] = await Promise.all([
    getDashboardStats(restaurant.id),
    getTopProducts(restaurant.id, 8),
    getMostOrdered(restaurant.id, 8),
    getPeakHours(restaurant.id),
    getTableStats(restaurant.id),
    getStaffLeaderboard(restaurant.id, 8),
    getSalesSeries(restaurant.id),
  ]);
  const maxStaff = Math.max(...staff.map((s) => s.total), 1);

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

      {/* Bo'limlararo navigatsiya (§38) */}
      <nav className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* Asosiy KPI kartochkalari */}
      <div id="umumiy" className="grid scroll-mt-16 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Savdo tahlili — interaktiv (davr + metrika almashtirgichi, §39) */}
      <div id="savdo" className="scroll-mt-16">
        <SalesChart series={series} currency={cur} />
      </div>

      {/* Eng ko'p ko'rilgan / eng ko'p buyurtma qilingan */}
      <div id="mahsulotlar" className="grid scroll-mt-16 gap-6 lg:grid-cols-2">
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

      {/* Xodimlar reytingi + oshxona samaradorligi */}
      <div id="xodimlar" className="grid scroll-mt-16 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-foreground">Xodimlar reytingi</h2>
            <Badge variant="accent">30 kun</Badge>
          </div>
          {staff.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Hali ofitsant orqali buyurtma yo'q. Xodimlar panel orqali buyurtma olganda bu yerda ko'rinadi.
            </p>
          ) : (
            <div className="space-y-3">
              {staff.map((s, i) => {
                const medal = ["🥇", "🥈", "🥉"];
                return (
                  <div key={s.name + i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm">
                      {medal[i] ?? <span className="text-muted">{i + 1}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                        <p className="shrink-0 text-sm font-bold text-foreground">
                          {formatPrice(s.total, cur)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                          <div
                            style={{ width: `${(s.total / maxStaff) * 100}%` }}
                            className="h-full rounded-full bg-accent"
                          />
                        </div>
                        <span className="shrink-0 text-[11px] text-muted">
                          {s.orders} buyurtma · {s.dishes} taom
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Oshxona: o'rtacha tayyorlash vaqti */}
        <Card className="flex flex-col justify-center p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Timer className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats.avgPrepMins > 0 ? `${stats.avgPrepMins}` : "—"}
            {stats.avgPrepMins > 0 && <span className="text-lg text-muted"> daq</span>}
          </p>
          <p className="mt-1 text-sm text-muted">O'rtacha tayyorlash vaqti</p>
          <p className="mt-0.5 text-xs text-muted/70">Oshxona: buyurtmadan tayyorgacha (7 kun)</p>
        </Card>
      </div>

      {/* Faol soat + eng faol stol */}
      <div id="qr" className="grid scroll-mt-16 gap-6 lg:grid-cols-2">
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
