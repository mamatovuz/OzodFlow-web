"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Globe,
  Store,
  Crown,
  Ticket,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admins", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/admins/payments", label: "To'lovlar", icon: Wallet },
  { href: "/admins/cards", label: "Kartalar", icon: CreditCard },
  { href: "/admins/plans", label: "Tariflar", icon: Crown },
  { href: "/admins/promos", label: "Promo kodlar", icon: Ticket },
  { href: "/admins/domains", label: "Domenlar", icon: Globe },
  { href: "/admins/restaurants", label: "Restoranlar", icon: Store },
  { href: "/admins/settings", label: "Sozlamalar", icon: Settings },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admins/login");
    router.refresh();
  }

  const Content = () => (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center gap-2 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span className="font-semibold text-foreground">Admin panel</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active =
            item.href === "/admins"
              ? pathname === "/admins"
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
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted">Administrator</p>
        </div>
        <button onClick={logout} className="text-muted hover:text-error">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-foreground" />
          <span className="font-semibold text-foreground">Admin</span>
        </div>
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

      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <Content />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-card">
            <button
              className="absolute right-3 top-3 text-muted"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <Content />
          </div>
        </div>
      )}
    </>
  );
}
