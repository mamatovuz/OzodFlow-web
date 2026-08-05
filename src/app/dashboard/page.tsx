import Link from "next/link";
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
  PRO: "Pro",
  BUSINESS: "Business", STARTER: "Starter",
};

export default async function DashboardHome() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;
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

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Salom, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">
            {restaurant.name} — bugungi ko'rsatkichlar
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/menu">
            <Button>
              <Plus className="h-4 w-4" /> Mahsulot qo'shish
            </Button>
          </Link>
        </div>
      </div>

      {/* Jonli statistika */}
      <LiveCounter />

      {/* Buyurtma kartalari */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/orders">
          <Card className="p-5 transition-all hover:shadow-card">
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
          <Card className="p-5 transition-all hover:shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Flame className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.activeOrders}</p>
            <p className="mt-0.5 text-sm text-muted">Faol buyurtmalar</p>
          </Card>
        </Link>
      </div>

      {/* Statistika kartalari */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
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
                    style={{ height: `${Math.max((d.count / maxDaily) * 100, d.count > 0 ? 6 : 2)}%` }}
                    className="w-full min-h-[4px] rounded-t-md bg-accent/80 transition-all hover:bg-accent"
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
                  Pro ga o'tish
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
              <Card className="flex items-center gap-4 p-5 transition-all hover:shadow-card">
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
