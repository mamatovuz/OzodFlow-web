"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquareText, ScrollText, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/instagram", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/instagram/rules", label: "Qoidalar", icon: MessageSquareText },
  { href: "/dashboard/instagram/logs", label: "Loglar", icon: ScrollText },
  { href: "/dashboard/instagram/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/dashboard/instagram/settings", label: "Sozlamalar", icon: Settings },
];

export function IgNav() {
  const pathname = usePathname();
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
