"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type NavBadgeCounts = {
  unreadMessages?: number;
  activeProjects?: number;
  pendingProposals?: number;
};

/**
 * Kabinet yon paneli.
 *
 * Desktopda doim ko'rinadi, mobilda esa chapdan suzib chiqadi.
 *
 * Mobil variantda `<dialog>` yoki Radix Sheet ISHLATILMADI: yon panel
 * navigatsiya, modal emas. Modal qilib qo'ysak orqa fon bloklanadi va
 * ekran o'quvchi uni "dialog" deb e'lon qiladi — bu navigatsiya uchun
 * noto'g'ri semantika. Oddiy `<nav>` va CSS transform yetarli.
 */
export function AppSidebar({
  groups,
  badges,
  open,
  onClose,
}: {
  groups: NavGroup[];
  badges: NavBadgeCounts;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("appNav");
  const tApp = useTranslations("app");
  const pathname = usePathname();

  // Escape bilan yopish — mobil panel ochiq bo'lganda.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Mobil fon qoplami. Bosilganda panel yopiladi. */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-border bg-card",
          "transition-transform duration-300 ease-[var(--ease-out-quart)]",
          // Desktopda har doim joyida, mobilda holatga qarab.
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sarlavha */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <Logo size="sm" />

          <button
            type="button"
            onClick={onClose}
            aria-label={tApp("closeSidebar")}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
          >
            <X className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {/* Navigatsiya */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Kabinet menyusi">
          {groups.map((group, groupIndex) => (
            <div key={group.key ?? `group-${groupIndex}`} className={cn(groupIndex > 0 && "mt-6")}>
              {group.key && (
                <h2 className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.key)}
                </h2>
              )}

              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const count = item.badge ? badges[item.badge] : undefined;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium",
                          "transition-colors duration-150",
                          active
                            ? "bg-brand-soft text-brand-soft-foreground"
                            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-[18px] shrink-0 transition-colors",
                            active ? "text-brand" : "text-muted-foreground"
                          )}
                          strokeWidth={1.75}
                          aria-hidden
                        />

                        <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>

                        {count !== undefined && count > 0 && (
                          <Badge
                            variant={active ? "solid" : "neutral"}
                            size="sm"
                            className="shrink-0 tabular"
                          >
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
