import Link from "next/link";
import { redirect } from "next/navigation";
import {
  QrCode,
  UtensilsCrossed,
  Layers,
  TrendingUp,
  Plus,
  Store,
  Clock,
  Crown,
} from "lucide-react";
import { ClipboardList, Wallet, Flame } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { getDashboardStats } from "@/lib/stats";
import { Card, Badge, Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { LiveCounter } from "@/components/dashboard/live-counter";

export const dynamic = "force-dynamic";

const planNames: Record<string, string> = {
  FREE: "Free",
  BUSINESS: "Business",
  STARTER: "Starter",
};

export default async function DashboardHome() {
  // Layout va page Next.js'da parallel render bo'ladi — layout redirect qilsa ham
  // bu yerda "!" ishlatish null'da crash beradi. Shuning uchun bu yerda ham guard.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");
  const stats = await getDashboardStats(restaurant.id);

  const cards = [
    {
      label: "Bugungi skanerlar",
      value: stats.todayScans,
      icon: QrCode,
      color: "text-accent bg-accent-soft",
    },
    {
      label: "Haftalik skanerlar",
      value: stats.weekScans,
      icon: TrendingUp,
      color: "text-success bg-success/10",
    },
    {
      label: "Faol mahsulotlar",
      value: stats.activeProducts,
      icon: UtensilsCrossed,
      color: "text-warning bg-warning/10",
    },
    {
      label: "Kategoriyalar",
      value: stats.categories,
      icon: Layers,
      color: "text-accent bg-accent-soft",
    },
  ];

  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);
  const maxDailyRev = Math.max(...stats.daily.map((d) => d.revenue), 1);
  const paidTotal = stats.todayCash + stats.todayCard;
  const cashPct = paidTotal ? Math.round((stats.todayCash / paidTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Sarlavha — gradient hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card sm:p-7"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        }}
      >
        {/* dekorativ doiralar */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Salom, {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <Store className="h-4 w-4" /> {restaurant.name} — bugungi ko'rsatkichlar
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/menu">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-accent shadow-soft transition-transform active:scale-[0.98]">
                <Plus className="h-4 w-4" /> Mahsulot qo'shish
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Jonli statistika */}
      <LiveCounter />

      {/* Buyurtma kartalari */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/orders">
          <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.todayOrders}</p>
            <p className="mt-0.5 text-sm text-muted">Bugungi buyurtmalar</p>
          </Card>
        </Link>
        <Card className="p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatPrice(stats.todayRevenue, restaurant.currency)}
          </p>
          <p className="mt-0.5 text-sm text-muted">Bugungi daromad</p>
        </Card>
        <Link href="/dashboard/orders">
          <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Flame className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.activeOrders}</p>
            <p className="mt-0.5 text-sm text-muted">Faol buyurtmalar</p>
          </Card>
        </Link>
      </div>

      {/* ─── Savdo statistikasi ─── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-accent" /> Savdo statistikasi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RevKpi label="Bugungi daromad" value={formatPrice(stats.todayRevenue, restaurant.currency)} />
          <RevKpi label="Haftalik daromad" value={formatPrice(stats.weekRevenue, restaurant.currency)} />
          <RevKpi label="Oylik daromad" value={formatPrice(stats.monthRevenue, restaurant.currency)} />
          <RevKpi label="O'rtacha chek" value={formatPrice(stats.avgCheck, restaurant.currency)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Haftalik daromad grafigi */}
          <Card className="p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Haftalik daromad</h3>
              <Badge variant="accent">7 kun</Badge>
            </div>
            <div className="flex h-44 items-stretch justify-between gap-2">
              {stats.daily.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      style={{ height: `${Math.max((d.revenue / maxDailyRev) * 100, d.revenue > 0 ? 5 : 2)}%` }}
                      className="w-full min-h-[4px] rounded-t-md bg-accent/80 transition-all hover:bg-accent"
                      title={formatPrice(d.revenue, restaurant.currency)}
                    />
                  </div>
                  <span className="text-xs text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Naqd / Karta taqsimoti (bugun) */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">Bugun: Naqd / Karta</h3>
            {paidTotal === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Bugun to'lov qabul qilinmagan</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted"><Wallet className="h-3.5 w-3.5" /> Naqd</span>
                    <span className="font-semibold text-foreground">{formatPrice(stats.todayCash, restaurant.currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-success" style={{ width: `${cashPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted"><ClipboardList className="h-3.5 w-3.5" /> Karta</span>
                    <span className="font-semibold text-foreground">{formatPrice(stats.todayCard, restaurant.currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${100 - cashPct}%` }} />
                  </div>
                </div>
                <div className="border-t border-border pt-3 text-center">
                  <p className="text-xs text-muted">Jami qabul qilingan</p>
                  <p className="text-lg font-bold text-foreground">{formatPrice(paidTotal, restaurant.currency)}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Menyu statistikasi kartalari */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div
              className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${c.color}`}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{c.value}</p>
            <p className="mt-0.5 text-sm text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Haftalik grafik */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Haftalik skanerlar</h2>
            <Badge variant="accent">Oxirgi 7 kun</Badge>
          </div>
          <div className="flex h-48 items-stretch justify-between gap-2">
            {stats.daily.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    style={{
                      height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 6 : 2)}%`,
                      backgroundImage:
                        "linear-gradient(to top, var(--accent), var(--accent-hover))",
                    }}
                    className="w-full min-h-[4px] rounded-t-md opacity-90 transition-all hover:opacity-100"
                    title={`${d.count} skan`}
                  />
                </div>
                <span className="text-xs text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* O'ng ustun */}
        <div className="space-y-6">
          {/* Obuna */}
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-warning" />
              <h2 className="font-semibold text-foreground">Obuna</h2>
            </div>
            <p className="text-lg font-bold text-foreground">
              {planNames[stats.plan] ?? stats.plan} tarif
            </p>
            {stats.planUntil ? (
              <p className="mt-1 text-sm text-muted">
                Amal qiladi:{" "}
                {new Date(stats.planUntil).toLocaleDateString("uz-UZ")}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Muddatsiz</p>
            )}
            {stats.plan === "FREE" && (
              <Link href="/dashboard/settings" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  Business ga o'tish
                </Button>
              </Link>
            )}
          </Card>

          {/* Oxirgi o'zgartirish */}
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted" />
              <h2 className="font-semibold text-foreground">
                Oxirgi o'zgartirish
              </h2>
            </div>
            {stats.lastUpdated ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  {stats.lastUpdated.name}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {new Date(stats.lastUpdated.updatedAt).toLocaleString("uz-UZ")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Hali o'zgartirish yo'q</p>
            )}
          </Card>
        </div>
      </div>

      {/* Tezkor amallar */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground">Tezkor amallar</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href: "/dashboard/menu",
              icon: UtensilsCrossed,
              title: "Menyu boshqaruvi",
              desc: "Kategoriya va mahsulotlar",
            },
            {
              href: "/dashboard/qr",
              icon: QrCode,
              title: "QR kod",
              desc: "Yuklab olish va sozlash",
            },
            {
              href: "/dashboard/profile",
              icon: Store,
              title: "Restoran profili",
              desc: "Logo, manzil, aloqa",
            },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <a.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-sm text-muted">{a.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Savdo KPI kartasi — daromad ko'rsatkichlari uchun
function RevKpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </Card>
  );
}
