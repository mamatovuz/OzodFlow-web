import Link from "next/link";
import { redirect } from "next/navigation";
import {
  QrCode,
  UtensilsCrossed,
  Plus,
  Store,
  Crown,
  Wallet,
  ClipboardList,
  Receipt,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  Ban,
  Clock,
  Table2,
  ChefHat,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import {
  getDashboardStats,
  getDashboardExtras,
  getTopSellingProducts,
  getSalesSeries,
} from "@/lib/stats";
import { statusMeta } from "@/lib/orders";
import { Card, Badge } from "@/components/ui";
import { formatPrice, formatCompact, cn } from "@/lib/utils";
import { LiveCounter } from "@/components/dashboard/live-counter";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { TableMap } from "@/components/dashboard/table-map";

export const dynamic = "force-dynamic";

const planNames: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  BUSINESS: "Business",
  PROMAX: "Pro Max",
};

export default async function DashboardHome() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) redirect("/login");

  const [stats, extras, topProducts, series] = await Promise.all([
    getDashboardStats(restaurant.id),
    getDashboardExtras(restaurant.id),
    getTopSellingProducts(restaurant.id, 5),
    getSalesSeries(restaurant.id),
  ]);
  const cur = restaurant.currency;

  // Kecha bilan solishtirish uchun o'rtacha chek
  const yAvg =
    extras.yesterdayOrdersPaid > 0
      ? Math.round(stats.yesterdayRevenue / extras.yesterdayOrdersPaid)
      : 0;

  const kpis: {
    label: string;
    value: string;
    icon: LucideIcon;
    today?: number;
    prev?: number;
    hint?: string;
  }[] = [
    {
      label: "Bugungi daromad",
      value: formatPrice(stats.todayRevenue, cur),
      icon: Wallet,
      today: stats.todayRevenue,
      prev: stats.yesterdayRevenue,
    },
    {
      label: "Buyurtmalar",
      value: String(stats.todayOrders),
      icon: ClipboardList,
      today: stats.todayOrders,
      prev: stats.yesterdayOrders,
    },
    {
      label: "O'rtacha chek",
      value: formatPrice(stats.avgCheck, cur),
      icon: Receipt,
      today: stats.avgCheck,
      prev: yAvg,
    },
    {
      label: "QR skanlar",
      value: String(stats.todayScans),
      icon: QrCode,
      today: stats.todayScans,
      prev: extras.yesterdayScans,
    },
    {
      label: "Band stollar",
      value: `${extras.tables.busy + extras.tables.awaitingPayment}`,
      icon: Table2,
      hint: `${extras.tables.free} bo'sh · ${extras.tables.total} jami`,
    },
    {
      label: "Bekor qilingan",
      value: String(extras.todayCancelled),
      icon: XCircle,
      hint: "bugun",
    },
  ];

  // E'tibor talab qiladigan holatlar (real signallar)
  const attention: {
    tone: "warning" | "error";
    icon: typeof AlertTriangle;
    text: string;
    href: string;
    cta: string;
  }[] = [];
  if (extras.stopListCount > 0)
    attention.push({
      tone: "error",
      icon: Ban,
      text: `${extras.stopListCount} ta mahsulot stop-listda (tugagan)`,
      href: "/dashboard/stoplist",
      cta: "Stop-listni ko'rish",
    });
  if (extras.stuckOrders.length > 0)
    attention.push({
      tone: "warning",
      icon: Clock,
      text: `${extras.stuckOrders.length} ta buyurtma 15 daqiqadan beri tayyorlanmoqda`,
      href: "/dashboard/orders",
      cta: "Buyurtmalarni ko'rish",
    });
  if (stats.plan === "FREE")
    attention.push({
      tone: "warning",
      icon: Crown,
      text: "Sinov tarifidasiz — barcha imkoniyatlar uchun tarifni faollashtiring",
      href: "/dashboard/settings",
      cta: "Tariflarni ko'rish",
    });

  const now = new Date();
  const dateLabel = now.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", weekday: "short" });

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Salom, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Store className="h-4 w-4" /> {restaurant.name} — bugungi restoran faoliyati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1.5 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5" /> {dateLabel}
          </Badge>
          <Link
            href="/dashboard/menu"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-hover active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Mahsulot
          </Link>
        </div>
      </header>

      {/* ─── KPI (§1) ─── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs text-muted sm:text-sm">{k.label}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {k.value}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {typeof k.prev === "number" ? (
                <>
                  <Trend today={k.today ?? 0} prev={k.prev} />
                  <span className="hidden text-[11px] text-muted sm:inline">kecha</span>
                </>
              ) : (
                <span className="text-[11px] text-muted">{k.hint}</span>
              )}
            </div>
          </Card>
        ))}
      </section>

      {/* ─── Live Order Monitor (§2) — buyurtma oqimi ─── */}
      <section>
        <Card className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {[
            { key: "NEW", label: "Yangi", value: extras.pipeline.new },
            { key: "PREPARING", label: "Tayyorlanmoqda", value: extras.pipeline.preparing },
            { key: "READY", label: "Tayyor", value: extras.pipeline.ready },
            { key: "DELIVERED", label: "Yetkazilgan", value: extras.pipeline.delivered },
          ].map((step) => {
            const meta = statusMeta(step.key);
            return (
              <Link
                key={step.key}
                href="/dashboard/orders"
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-2"
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none text-foreground tabular-nums">{step.value}</p>
                  <p className="mt-1 truncate text-xs text-muted">{step.label}</p>
                </div>
              </Link>
            );
          })}
        </Card>
      </section>

      {/* ─── HOZIR (jonli holat — 3 soniyada yangilanadi) ─── */}
      <LiveCounter />

      {/* ─── E'tibor talab qiladi ─── */}
      {attention.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" /> E'tibor talab qiladi
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((a, i) => (
              <Link key={i} href={a.href}>
                <Card
                  className={cn(
                    "flex h-full items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card",
                    a.tone === "error" ? "border-l-4 border-l-error" : "border-l-4 border-l-warning"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      a.tone === "error" ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
                    )}
                  >
                    <a.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.text}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent">
                      {a.cta} <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Stollar xaritasi (§6 — jonli) ─── */}
      <TableMap currency={cur} />

      {/* ─── Savdo tahlili (interaktiv grafik) ─── */}
      <SalesChart series={series} currency={cur} />

      {/* ─── To'lovlar + Eng ko'p sotilgan ─── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* To'lovlar taqsimoti */}
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">To'lovlar (bugun)</h3>
          <PaymentBreakdown payment={extras.payment} currency={cur} />
        </Card>

        {/* Top mahsulotlar */}
        <Card className="p-5 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Eng ko'p sotilgan</h3>
            <Link href="/dashboard/stats" className="inline-flex items-center gap-1 text-xs font-medium text-accent">
              Batafsil <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Oxirgi 30 kunda sotuv bo'lmagan</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatPrice(p.revenue, cur)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(p.share, 3)}%` }} />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted">{p.qty} ta · {p.share}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── So'nggi buyurtmalar (§14) ─── */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">So'nggi buyurtmalar</h3>
          <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            Barchasi <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {extras.recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Hali buyurtma yo'q</p>
        ) : (
          <div className="divide-y divide-border">
            {extras.recentOrders.map((o) => {
              const meta = statusMeta(o.status);
              return (
                <Link
                  key={o.id}
                  href="/dashboard/orders"
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="text-sm font-semibold text-foreground tabular-nums">#{o.number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {o.orderType === "DELIVERY" ? "🚚 Yetkazish" : o.tableName || o.tableCode || "Stol —"}
                    </p>
                    {o.waiterName && <p className="truncate text-[11px] text-muted">{o.waiterName}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground">
                    {formatPrice(o.total, cur)}
                  </span>
                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium", meta.badge)}>
                    {meta.label}
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-muted tabular-nums sm:inline">
                    {new Date(o.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Obuna + Tezkor amallar ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Obuna */}
        <Card className="flex flex-col p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-foreground">Obuna</h3>
          </div>
          <p className="text-lg font-bold text-foreground">{planNames[stats.plan] ?? stats.plan} tarif</p>
          <p className="mt-1 text-sm text-muted">
            {stats.planUntil
              ? `Amal qiladi: ${new Date(stats.planUntil).toLocaleDateString("uz-UZ")}`
              : "Muddatsiz"}
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-accent"
          >
            {stats.plan === "FREE" ? "Tarifni faollashtirish" : "Obunani boshqarish"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        {/* Tezkor amallar */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-foreground">Tezkor amallar</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/dashboard/menu", icon: Plus, title: "Mahsulot qo'shish" },
              { href: "/dashboard/orders", icon: ClipboardList, title: "Buyurtmalar" },
              { href: "/dashboard/qr", icon: QrCode, title: "QR yaratish" },
              { href: "/dashboard/stoplist", icon: Ban, title: "Stop-list" },
              { href: "/dashboard/stats", icon: ChefHat, title: "Statistika" },
              { href: `/m/${restaurant.slug}`, icon: UtensilsCrossed, title: "Menyu ko'rish" },
            ].map((a) => (
              <Link key={a.title} href={a.href} target={a.href.startsWith("/m/") ? "_blank" : undefined}>
                <Card className="flex h-full items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <a.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{a.title}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kecha bilan solishtirish trend belgisi ───
function Trend({ today, prev }: { today: number; prev: number }) {
  if (prev <= 0) {
    if (today > 0)
      return (
        <span className="flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
          <ArrowUp className="h-3 w-3" /> yangi
        </span>
      );
    return <span className="text-[11px] text-muted/70">kecha 0</span>;
  }
  const pct = Math.round(((today - prev) / prev) * 100);
  if (pct === 0) return <span className="text-[11px] text-muted/70">= kecha</span>;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        up ? "bg-success/10 text-success" : "bg-error/10 text-error"
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ─── To'lov taqsimoti (naqd / karta / aralash) ───
function PaymentBreakdown({
  payment,
  currency,
}: {
  payment: { cash: number; card: number; mixed: number };
  currency: string;
}) {
  const total = payment.cash + payment.card + payment.mixed;
  if (total === 0) return <p className="py-6 text-center text-sm text-muted">Bugun to'lov qabul qilinmagan</p>;
  const pct = (v: number) => Math.round((v / total) * 100);
  const rows = [
    { label: "Naqd", value: payment.cash, color: "bg-success" },
    { label: "Karta", value: payment.card, color: "bg-accent" },
    { label: "Aralash", value: payment.mixed, color: "bg-warning" },
  ].filter((r) => r.value > 0);

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted">{r.label}</span>
            <span className="font-semibold text-foreground">
              {formatCompact(r.value)} <span className="text-xs font-normal text-muted">{pct(r.value)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", r.color)} style={{ width: `${pct(r.value)}%` }} />
          </div>
        </div>
      ))}
      <div className="border-t border-border pt-3 text-center">
        <p className="text-xs text-muted">Jami qabul qilingan</p>
        <p className="text-lg font-bold text-foreground">{formatPrice(total, currency)}</p>
      </div>
    </div>
  );
}

