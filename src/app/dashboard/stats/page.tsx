import { QrCode, TrendingUp, Calendar, Eye } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getDashboardStats, getTopProducts } from "@/lib/stats";
import { Card, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
  const stats = await getDashboardStats(restaurant.id);
  const top = await getTopProducts(restaurant.id, 8);

  const cards = [
    { label: "Bugun", value: stats.todayScans, icon: QrCode },
    { label: "Bu hafta", value: stats.weekScans, icon: TrendingUp },
    { label: "Bu oy", value: stats.monthScans, icon: Calendar },
  ];
  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);
  const maxViews = Math.max(...top.map((p) => p.views), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistika</h1>
        <p className="mt-1 text-sm text-muted">
          QR skanerlar va mahsulotlar ko'rsatkichlari
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="mt-0.5 text-sm text-muted">{c.label} skanerlar</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Haftalik dinamika</h2>
            <Badge variant="accent">7 kun</Badge>
          </div>
          <div className="flex h-48 items-stretch justify-between gap-2">
            {stats.daily.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    style={{ height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 6 : 2)}%` }}
                    className="w-full min-h-[4px] rounded-t-md bg-accent/80"
                    title={`${d.count}`}
                  />
                </div>
                <span className="text-xs text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-foreground">Eng ko'p ko'rilgan</h2>
          </div>
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Hali ma'lumot yo'q
            </p>
          ) : (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-medium text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.name}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                      <div
                        style={{ width: `${(p.views / maxViews) * 100}%` }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted">{p.views}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
