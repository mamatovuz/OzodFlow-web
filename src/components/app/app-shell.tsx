"use client";

import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AppSidebar, type NavBadgeCounts } from "@/components/app/app-sidebar";
import { navForRole } from "@/components/app/nav-config";
import { UserMenu, type UserMenuUser } from "@/components/app/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/enums";

/**
 * Kabinet qobig'i: yon panel + yuqori panel + kontent.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA KLIENT KOMPONENTI
 *
 *  Mobil yon panelning ochiq/yopiq holati klientda saqlanishi kerak.
 *
 *  DIQQAT: navigatsiya ro'yxati bu yerda `navForRole()` bilan HISOBLANADI,
 *  server tomondan PROP sifatida uzatilmaydi. Sababi: `NavItem` ichida
 *  `icon` — React komponenti, ya'ni funksiya. Funksiyani serverdan
 *  klientga uzatib bo'lmaydi (serializatsiya qilinmaydi). Shuning uchun
 *  serverdan faqat `role` matni keladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function AppShell({
  user,
  badges,
  children,
}: {
  user: UserMenuUser;
  badges: NavBadgeCounts;
  children: React.ReactNode;
}) {
  const t = useTranslations("app");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groups = navForRole(user.role);
  const isDeveloper = user.role === UserRole.DEVELOPER;

  return (
    <div className="min-h-dvh bg-surface-1">
      <AppSidebar
        groups={groups}
        badges={badges}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Kontent yon panel kengligiga suriladi (faqat desktopda) */}
      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t("openSidebar")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
          </button>

          {/* Bo'sh joy — o'ng tomondagi elementlarni chetga suradi */}
          <div className="flex-1" />

          {/* Mijoz uchun asosiy harakat. Developerga loyiha yaratish
              tugmasi ko'rsatilmaydi — u buyurtma bermaydi. */}
          {!isDeveloper && (
            <Button asChild variant="brand" size="sm" className="max-sm:hidden">
              <Link href="/projects/new">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                {t("newProject")}
              </Link>
            </Button>
          )}

          <ThemeToggle />
          <UserMenu user={user} />
        </header>

        <main id="main" className="px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
