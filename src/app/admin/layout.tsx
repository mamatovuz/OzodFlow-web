import {
  ArrowLeft,
  Banknote,
  FileSearch,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { countUnverifiedDevelopers } from "@/lib/developers";
import { ApplicationStatus, ProjectStatus } from "@/lib/enums";

/**
 * Admin panel qobig'i.
 *
 * Kabinetdan ALOHIDA qobiq: admin ishi butunlay boshqa — u loyiha
 * buyurtma qilmaydi, u platformani boshqaradi. Bitta navigatsiyaga
 * ikkalasini tiqishtirish ikkalasini ham noqulay qilardi.
 *
 * `requireAdmin()` shu yerda — barcha ichki sahifalar himoyalangan.
 * Middleware ham tekshiradi, lekin u faqat tokenga qaraydi; bu yer
 * rolni databasedan qayta o'qiydi.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin("/admin");
  const t = await getTranslations("admin");

  // E'tibor talab qiladigan ishlar soni — navigatsiyada ko'rsatiladi,
  // shunda admin nimaga qarash kerakligini darhol biladi.
  const [pendingPayments, pendingProjects, unverifiedDevelopers, pendingApplications] =
    await Promise.all([
      db.payment.count({ where: { status: "PENDING" } }),
      db.project.count({ where: { status: ProjectStatus.PENDING_REVIEW } }),
      countUnverifiedDevelopers(),
      // Ko'rikni kutayotgan arizalar — admin nimaga qarash kerakligini
      // darhol bilishi uchun.
      db.developerApplication.count({
        where: {
          status: {
            in: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.UNDER_REVIEW,
              ApplicationStatus.TEST_SUBMITTED,
            ],
          },
        },
      }),
    ]);

  const navItems = [
    { href: "/admin", label: t("nav.overview"), icon: LayoutDashboard, badge: 0 },
    {
      href: "/admin/payments",
      label: t("nav.payments"),
      icon: Banknote,
      badge: pendingPayments,
    },
    {
      href: "/admin/moderation",
      label: t("nav.moderation"),
      icon: FileSearch,
      badge: pendingProjects,
    },
    {
      href: "/admin/applications",
      label: t("nav.applications"),
      icon: UserCheck,
      badge: pendingApplications,
    },
    {
      href: "/admin/users",
      label: t("nav.users"),
      icon: Users,
      badge: unverifiedDevelopers,
    },
    { href: "/admin/audit", label: t("nav.audit"), icon: ScrollText, badge: 0 },
    { href: "/admin/settings", label: t("nav.settings"), icon: Settings, badge: 0 },
  ];

  return (
    <div className="min-h-dvh bg-surface-1">
      {/* Yuqori panel — admin ekanini aniq bildiradigan to'q chiziq */}
      <header className="sticky top-0 z-30 border-b border-border bg-foreground">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Logo size="sm" showText={false} />

          <span className="font-display text-sm font-semibold text-background">
            {t("title")}
          </span>

          <div className="flex-1" />

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-background/70 transition-colors hover:text-background"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
            <span className="max-sm:hidden">{t("backToApp")}</span>
          </Link>

          <ThemeToggle className="text-background/70 hover:bg-background/10 hover:text-background" />

          <span className="text-[13px] font-medium text-background/70 max-sm:hidden">
            {user.name}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Mobil navigatsiya — gorizontal skroll, kontent USTIDA.
            Desktop yon paneli bilan bir qatorga tushmasligi uchun
            flex konteyneridan TASHQARIDA turadi. */}
        <nav
          className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden"
          aria-label="Admin menyusi"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground"
            >
              {item.label}
              {item.badge > 0 && (
                <Badge variant="warning" size="sm">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex gap-6">
        {/* Yon navigatsiya — faqat desktopda */}
        <nav
          className="shrink-0 max-lg:hidden lg:w-56"
          aria-label="Admin menyusi"
        >
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <item.icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1">{item.label}</span>

                  {item.badge > 0 && (
                    <Badge variant="warning" size="sm" className="tabular">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
        </div>
      </div>
    </div>
  );
}
