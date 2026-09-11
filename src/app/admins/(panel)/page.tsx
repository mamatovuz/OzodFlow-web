import Link from "next/link";
import { Wallet, Store, Clock, CheckCircle2, Globe, Eye, AlertTriangle, Activity, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const in7Days = new Date(now.getTime() + 7 * 864e5);

  const [
    pending,
    domainsPending,
    restaurants,
    approvedAgg,
    recent,
    visitsToday,
    expiring,
    activeScanGroups,
    activeOrderGroups,
  ] = await Promise.all([
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.domainRequest.count({ where: { status: "PENDING" } }),
    prisma.restaurant.count(),
    prisma.paymentRequest.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.paymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { restaurant: { select: { name: true } } },
    }),
    prisma.siteVisit.count({ where: { createdAt: { gte: todayStart } } }),
    // Obunasi 7 kun ichida tugaydigan pullik restoranlar
    prisma.restaurant.findMany({
      where: {
        planUntil: { gte: now, lte: in7Days },
        plan: { not: "FREE" },
        isBlocked: false,
      },
      orderBy: { planUntil: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        plan: true,
        planUntil: true,
        owner: { select: { name: true, phone: true, email: true } },
      },
    }),
    // Oxirgi 7 kunda faol restoranlar (skan yoki buyurtma bo'yicha)
    prisma.scanEvent.groupBy({
      by: ["restaurantId"],
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.order.groupBy({
      by: ["restaurantId"],
      where: { createdAt: { gte: weekAgo } },
    }),
  ]);

  // Faol restoranlar — skan yoki buyurtma qilganlar birlashmasi
  const activeSet = new Set<string>([
    ...activeScanGroups.map((g) => g.restaurantId),
    ...activeOrderGroups.map((g) => g.restaurantId),
  ]);
  const activeCount = activeSet.size;
  const inactiveCount = Math.max(0, restaurants - activeCount);

  const cards = [
    { label: "Bugungi tashriflar", value: visitsToday, icon: Eye, href: "/admins/analytics" },
    { label: "Kutilayotgan to'lovlar", value: pending, icon: Clock, href: "/admins/payments" },
    { label: "Restoranlar", value: restaurants, icon: Store, href: "/admins/restaurants" },
    {
      label: "Jami tushum",
      value: formatPrice(approvedAgg._sum.amount || 0, "UZS"),
      icon: CheckCircle2,
      href: "/admins/analytics",
    },
    { label: "Domen so'rovlari", value: domainsPending, icon: Globe, href: "/admins/domains" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin panel</h1>
        <p className="mt-1 text-sm text-muted">Platforma boshqaruvi</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <Card className="p-5 transition-all hover:shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="mt-0.5 text-sm text-muted">{c.label}</p>
            </Card>
          );
          return c.href ? (
            <Link key={c.label} href={c.href}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* Faollik + obuna tugashi */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Faol / nofaol restoranlar */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-foreground">Faollik (7 kun)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success/10 p-4 text-center">
              <p className="text-2xl font-bold text-success">{activeCount}</p>
              <p className="mt-0.5 text-xs text-muted">Faol restoran</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
              <p className="mt-0.5 text-xs text-muted">Nofaol (jim)</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${restaurants ? Math.round((activeCount / restaurants) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {restaurants ? Math.round((activeCount / restaurants) * 100) : 0}% restoran oxirgi 7 kunda faol edi
          </p>
        </Card>

        {/* Obunasi tugayotganlar */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" /> Obunasi tugayotganlar (7 kun)
            </h2>
            <Link href="/admins/restaurants" className="text-sm text-accent hover:underline">
              Restoranlar →
            </Link>
          </div>
          {expiring.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Yaqin 7 kunda tugaydigan obuna yo'q ✅
            </p>
          ) : (
            <div className="space-y-2">
              {expiring.map((r) => {
                const days = Math.max(
                  0,
                  Math.ceil((+new Date(r.planUntil!) - Date.now()) / 864e5)
                );
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        <Crown className="h-3.5 w-3.5 text-warning" /> {r.name}
                        <Badge variant="accent">{r.plan}</Badge>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {r.owner?.name} · {r.owner?.phone || r.owner?.email || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                        days <= 1 ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {days === 0 ? "Bugun" : `${days} kun`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Oxirgi to'lov so'rovlari</h2>
          <Link href="/admins/payments" className="text-sm text-accent hover:underline">
            Hammasi →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">So'rovlar yo'q</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {r.restaurant.name} — {r.plan}
                    </p>
                    <p className="text-xs text-muted">
                      {formatPrice(r.amount, "UZS")} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    r.status === "APPROVED"
                      ? "success"
                      : r.status === "REJECTED"
                      ? "error"
                      : "warning"
                  }
                >
                  {r.status === "APPROVED"
                    ? "Tasdiqlangan"
                    : r.status === "REJECTED"
                    ? "Rad etilgan"
                    : "Kutilmoqda"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
