"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Table2,
  Store,
  Palette,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Buyurtmalar", icon: ClipboardList },
  { href: "/dashboard/menu", label: "Menyu", icon: UtensilsCrossed },
  { href: "/dashboard/tables", label: "Stollar", icon: Table2 },
  { href: "/dashboard/profile", label: "Restoran profili", icon: Store },
  { href: "/dashboard/design", label: "Menyu dizayni", icon: Palette },
  { href: "/dashboard/qr", label: "QR kod", icon: QrCode },
  { href: "/dashboard/stats", label: "Statistika", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Sozlamalar", icon: Settings },
];

export function Sidebar({
  user,
  restaurantSlug,
}: {
  user: { name: string; email: string | null; phone: string | null };
  restaurantSlug: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavItems = () => (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Content = () => (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between px-1">
        <Logo href="/dashboard" />
        <button className="lg:hidden" onClick={() => setOpen(false)}>
          <X className="h-5 w-5 text-muted" />
        </button>
      </div>

      <NavItems />

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <a
          href={`/m/${restaurantSlug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Menyuni ko'rish
        </a>
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">
              {user.email || user.phone}
            </p>
          </div>
          <button
            onClick={logout}
            title="Chiqish"
            className="text-muted hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <Content />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-card">
            <Content />
          </div>
        </div>
      )}
    </>
  );
}
