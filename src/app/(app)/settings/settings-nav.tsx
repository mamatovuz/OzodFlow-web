"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type SettingsTab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Sozlamalar bo'limlari.
 *
 * Klient komponent, chunki faol bo'limni aniqlash uchun `usePathname`
 * kerak. Havolalar oddiy `<Link>` — prefetch bilan o'tish darhol
 * bo'ladi.
 *
 * Kichik ekranda gorizontal aylanadi: bo'limlar sig'masa ularni
 * ustma-ust taxlashdan ko'ra surib ko'rish tabiiyroq.
 */
export function SettingsNav({
  tabs,
  ariaLabel,
}: {
  tabs: SettingsTab[];
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
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
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
