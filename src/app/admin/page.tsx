import {
  Banknote,
  Briefcase,
  CircleCheckBig,
  FileSearch,
  Lock,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { StatGrid, StatTile } from "@/components/app/stat-tile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import {
  ACTIVE_PROJECT_STATUSES,
  ProjectStatus,
  SystemWallet,
  UserStatus,
} from "@/lib/enums";
import { reconcileEscrow } from "@/lib/escrow";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Admin panel",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  await requireAdmin("/admin");
  const t = await getTranslations("admin.overview");

  const [
    pendingPayments,
    pendingProjects,
    activeProjects,
    totalUsers,
    platformWallet,
    reconciliation,
  ] = await Promise.all([
    db.payment.count({ where: { status: "PENDING" } }),
    db.project.count({ where: { status: ProjectStatus.PENDING_REVIEW } }),
    db.project.count({ where: { status: { in: [...ACTIVE_PROJECT_STATUSES] } } }),
    db.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
    db.wallet.findUnique({
      where: { systemKey: SystemWallet.PLATFORM_REVENUE },
      select: { balance: true },
    }),
    reconcileEscrow(),
  ]);

  const nothingToDo = pendingPayments === 0 && pendingProjects === 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/*
        BUXGALTERIYA TEKSHIRUVI — eng tepada.

        Farq chiqsa bu kodda xato borligini bildiradi va darhol ko'rinishi
        kerak. Uni statistika orasiga yashirish — muammoni sezmaslik demak.
      */}
      {reconciliation.ok ? (
        <Alert variant="success" title={t("reconcileOk")}>
          {t("reconcileOkBody")}
        </Alert>
      ) : (
        <Alert variant="danger" title={t("reconcileFail")}>
          {t("reconcileFailBody", {
            actual: formatMoney(reconciliation.actualLocked),
            expected: formatMoney(reconciliation.expectedLocked),
            difference: formatMoney(reconciliation.difference),
          })}
        </Alert>
      )}

      {/* E'tibor talab qiladigan ishlar */}
      {nothingToDo ? (
        <Alert variant="info" hideIcon>
          <span className="inline-flex items-center gap-2">
            <CircleCheckBig className="size-4" strokeWidth={2} aria-hidden />
            {t("nothingToDo")}
          </span>
        </Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pendingPayments > 0 && (
            <ActionCard
              icon={Banknote}
              count={pendingPayments}
              label={t("pendingPayments")}
              href="/admin/payments"
            />
          )}
          {pendingProjects > 0 && (
            <ActionCard
              icon={FileSearch}
              count={pendingProjects}
              label={t("pendingProjects")}
              href="/admin/moderation"
            />
          )}
        </div>
      )}

      <StatGrid>
        <StatTile
          label={t("platformRevenue")}
          value={formatMoney(platformWallet?.balance ?? 0n)}
          icon={Banknote}
          emphasis
        />
        <StatTile
          label={t("escrowHeld")}
          value={formatMoney(reconciliation.expectedLocked)}
          icon={Lock}
        />
        <StatTile
          label={t("activeProjects")}
          value={String(activeProjects)}
          icon={Briefcase}
        />
        <StatTile label={t("totalUsers")} value={String(totalUsers)} icon={Users} />
      </StatGrid>
    </div>
  );
}

/** E'tibor talab qiladigan ish kartochkasi. */
function ActionCard({
  icon: Icon,
  count,
  label,
  href,
}: {
  icon: typeof Banknote;
  count: number;
  label: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-warning/30 bg-warning-soft/30 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning/20 text-warning-soft-foreground">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-xl font-semibold leading-none [font-variant-numeric:proportional-nums]">
          {count}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
      </div>

      <Button asChild variant="secondary" size="sm">
        <Link href={href}>Ko&apos;rish</Link>
      </Button>
    </div>
  );
}

/**
 * Admin paneli HAR SO'ROVDA yangidan chiziladi.
 *
 * Bu yerdagi raqamlar (kutilayotgan to'lovlar, buxgalteriya farqi)
 * qaror qabul qilish uchun ishlatiladi — eskirgan ma'lumot ko'rsatish
 * xavfli bo'lardi.
 */
export const dynamic = "force-dynamic";
