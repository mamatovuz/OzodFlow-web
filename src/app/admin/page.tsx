import Link from "next/link";
import { Wallet, Store, Users, Clock, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [pending, restaurants, users, approvedAgg, recent] = await Promise.all([
    prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    prisma.restaurant.count(),
    prisma.user.count(),
    prisma.paymentRequest.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.paymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { restaurant: { select: { name: true } } },
    }),
  ]);

  const cards = [
    { label: "Kutilayotgan to'lovlar", value: pending, icon: Clock, href: "/admin/payments" },
    { label: "Restoranlar", value: restaurants, icon: Store, href: "/admin/restaurants" },
    { label: "Foydalanuvchilar", value: users, icon: Users },
    {
      label: "Jami tushum",
      value: formatPrice(approvedAgg._sum.amount || 0, "UZS"),
      icon: CheckCircle2,
    },
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

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Oxirgi to'lov so'rovlari</h2>
          <Link href="/admin/payments" className="text-sm text-accent hover:underline">
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
