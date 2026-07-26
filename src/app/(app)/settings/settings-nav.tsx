"use client";

import { Bell, Briefcase, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * SOZLAMALAR BO'LIMLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  IKONALAR SHU YERDA — SERVERDAN UZATILMAYDI
 *
 *  Lucide ikonasi — React komponenti, ya'ni FUNKSIYA. Funksiyani server
 *  komponentdan klient komponentga prop sifatida uzatib bo'lmaydi:
 *
 *    Error: Functions cannot be passed directly to Client Components
 *
 *  Bu xato `next build` da KO'RINMAYDI — u faqat sahifa ishga
 *  tushganda chiqadi va butun sahifa 500 qaytaradi. Aynan shu xato
 *  tufayli sozlamalar sahifasi ochilmagan edi.
 *
 *  Yechim: ikonalarni klient tomonda ushlab turamiz, serverdan faqat
 *  MATN keladi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kichik ekranda gorizontal aylanadi: bo'limlar sig'masa ularni
 * ustma-ust taxlashdan ko'ra surib ko'rish tabiiyroq.
 */

/** Bo'lim kalitlari — serverdagi tartib bilan bir xil. */
export type SettingsTabKey =
  | "profile"
  | "portfolio"
  | "security"
  | "notifications";

const TABS: Record<SettingsTabKey, { href: string; icon: typeof User }> = {
  profile: { href: "/settings/profile", icon: User },
  portfolio: { href: "/settings/portfolio", icon: Briefcase },
  security: { href: "/settings/security", icon: ShieldCheck },
  notifications: { href: "/settings/notifications", icon: Bell },
};

export function SettingsNav({
  tabs,
  ariaLabel,
}: {
  /** Ko'rsatiladigan bo'limlar va ularning tarjima qilingan nomlari. */
  tabs: Array<{ key: SettingsTabKey; label: string }>;
  ariaLabel: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      // `-mx-1 px-1` — fokus halqasi kesilib qolmasligi uchun joy.
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const config = TABS[tab.key];
        const isActive = pathname === config.href;
        const Icon = config.icon;

        return (
          <Link
            key={tab.key}
            href={config.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              isActive
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            )}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
