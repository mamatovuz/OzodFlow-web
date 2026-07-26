import {
  Banknote,
  Briefcase,
  CircleCheckBig,
  FileText,
  Lock,
  Plus,
  Search,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ProjectListItem } from "@/components/app/project-list-item";
import { StatGrid, StatTile } from "@/components/app/stat-tile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { UserRole, xpToNextLevel } from "@/lib/enums";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import {
  getCustomerDashboard,
  getDeveloperDashboard,
  type RecentProject,
} from "@/lib/queries/dashboard";

export const metadata: Metadata = {
  title: "Kabinet",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const t = await getTranslations("dashboard");

  const isDeveloper = user.role === UserRole.DEVELOPER;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("greeting", { name: user.name.split(" ")[0] ?? user.name })}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {isDeveloper ? t("developerSubtitle") : t("customerSubtitle")}
        </p>
      </header>

      {isDeveloper ? (
        <DeveloperView userId={user.id} />
      ) : (
        <CustomerView userId={user.id} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mijoz ko'rinishi
// ─────────────────────────────────────────────────────────────────────────────

async function CustomerView({ userId }: { userId: string }) {
  const t = await getTranslations("dashboard.customer");
  const data = await getCustomerDashboard(userId);

  return (
    <>
      {/* Harakat talab qiladigan holatlar — ko'rsatkichlardan OLDIN.
          Foydalanuvchi avval "nima qilishim kerak" degan savolga javob
          olishi kerak, keyin raqamlarni ko'radi. */}
      {data.proposalsToReview > 0 && (
        <Alert variant="info" title={t("proposalsToReview")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("proposalsHint")}</span>
            <Button asChild variant="secondary" size="sm">
              <Link href="/my-projects?status=OPEN">{t("viewAll")}</Link>
            </Button>
          </div>
        </Alert>
      )}

      {data.draftProjects > 0 && (
        <Alert variant="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("draftNotice", { count: data.draftProjects })}</span>
            <Button asChild variant="secondary" size="sm">
              <Link href="/my-projects?status=DRAFT">{t("draftCta")}</Link>
            </Button>
          </div>
        </Alert>
      )}

      <StatGrid>
        <StatTile
          label={t("balance")}
          value={formatMoney(data.balance)}
          hint={t("balanceHint")}
          icon={Banknote}
          emphasis
        />
        <StatTile
          label={t("locked")}
          value={formatMoney(data.lockedBalance)}
          hint={t("lockedHint")}
          icon={Lock}
        />
        <StatTile
          label={t("activeProjects")}
          value={String(data.activeProjects)}
          icon={Briefcase}
        />
        <StatTile
          label={t("completedProjects")}
          value={String(data.completedProjects)}
          icon={CircleCheckBig}
        />
        <StatTile
          label={t("totalSpent")}
          value={formatMoneyCompact(data.totalSpent)}
          icon={TrendingUp}
        />
      </StatGrid>

      <RecentProjects
        title={t("recentTitle")}
        description={t("recentDescription")}
        viewAllLabel={t("viewAll")}
        viewAllHref="/my-projects"
        projects={data.recentProjects}
        empty={{
          icon: Briefcase,
          title: t("emptyTitle"),
          description: t("emptyDescription"),
          action: (
            <Button asChild variant="brand">
              <Link href="/projects/new">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                {t("emptyCta")}
              </Link>
            </Button>
          ),
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer ko'rinishi
// ─────────────────────────────────────────────────────────────────────────────

async function DeveloperView({ userId }: { userId: string }) {
  const t = await getTranslations("dashboard.developer");
  const tLevels = await getTranslations("levels");
  const data = await getDeveloperDashboard(userId);

  const nextLevel = xpToNextLevel(data.xp);

  return (
    <>
      {/* Tasdiqlanmagan profil — eng muhim xabar, tepada turadi */}
      {!data.verified && (
        <Alert variant="warning" title={t("notVerifiedTitle")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("notVerifiedBody")}</span>
            {/* Ariza oqimi (test, portfolio yuklash) hali yozilmagan —
                shu sababli havola aloqa sahifasiga boradi. Tasdiqlashni
                hozircha admin panel orqali admin bajaradi. */}
            <Button asChild variant="secondary" size="sm">
              <Link href="/contact">{t("notVerifiedCta")}</Link>
            </Button>
          </div>
        </Alert>
      )}

      <StatGrid>
        <StatTile
          label={t("balance")}
          value={formatMoney(data.balance)}
          hint={t("balanceHint")}
          icon={Banknote}
          emphasis
        />
        <StatTile
          label={t("pending")}
          value={formatMoney(data.pendingEarnings)}
          hint={t("pendingHint")}
          icon={Lock}
        />
        <StatTile
          label={t("totalEarned")}
          value={formatMoneyCompact(data.totalEarned)}
          icon={TrendingUp}
        />
        <StatTile
          label={t("activeWork")}
          value={String(data.activeWork)}
          icon={Briefcase}
        />
        <StatTile
          label={t("rating")}
          // Reyting bo'lmasa "0,0" ko'rsatish chalg'ituvchi — chiziqcha
          // "hali baholanmagan" degan ma'noni to'g'ri beradi.
          value={
            data.ratingCount > 0
              ? data.ratingAvg.toFixed(1).replace(".", ",")
              : "—"
          }
          hint={t("ratingHint", { count: data.ratingCount })}
          icon={Star}
        />
        <StatTile
          label={t("completedProjects")}
          value={String(data.completedProjects)}
          icon={CircleCheckBig}
        />
        <StatTile
          label={t("level")}
          value={tLevels.has(data.level) ? tLevels(data.level) : data.level}
          hint={
            nextLevel
              ? t("xpToNext", {
                  next: tLevels.has(nextLevel.next)
                    ? tLevels(nextLevel.next)
                    : nextLevel.next,
                  remaining: nextLevel.remaining,
                })
              : t("maxLevel")
          }
          icon={Trophy}
        />
        <StatTile
          label={t("availableProjects")}
          value={String(data.availableProjects)}
          hint={t("availableHint")}
          icon={Search}
        />
        <StatTile
          label={t("pendingProposals")}
          value={String(data.pendingProposals)}
          icon={FileText}
        />
      </StatGrid>

      <RecentProjects
        title={t("recentTitle")}
        description={t("recentDescription")}
        viewAllLabel={t("browseProjects")}
        viewAllHref="/my-projects"
        projects={data.recentWork}
        empty={{
          icon: Search,
          title: t("emptyTitle"),
          description: t("emptyDescription"),
          action: (
            <Button asChild variant="brand">
              <Link href="/projects">{t("emptyCta")}</Link>
            </Button>
          ),
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy: oxirgi loyihalar ro'yxati
// ─────────────────────────────────────────────────────────────────────────────

function RecentProjects({
  title,
  description,
  viewAllLabel,
  viewAllHref,
  projects,
  empty,
}: {
  title: string;
  description: string;
  viewAllLabel: string;
  viewAllHref: string;
  projects: RecentProject[];
  empty: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    description: string;
    action: React.ReactNode;
  };
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        {projects.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={viewAllHref}>{viewAllLabel}</Link>
          </Button>
        )}
      </CardHeader>

      {projects.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectListItem project={project} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
