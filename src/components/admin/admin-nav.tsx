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
  MessageSquare,
  Handshake,
  BarChart3,
  LineChart,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { AdminPerm } from "@/lib/admin-perms";

// perm — bo'limni ko'rish uchun kerakli ruxsat.
//   super — faqat bosh admin ko'radi.
//   perm/super yo'q bo'lsa — barcha adminlar ko'radi (Bosh sahifa, Sozlamalar).
const nav: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: AdminPerm;
  super?: boolean;
}[] = [
  { href: "/admins", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/admins/analytics", label: "Analitika", icon: LineChart, perm: "analytics" },
  { href: "/admins/payments", label: "To'lovlar", icon: Wallet, perm: "payments" },
  { href: "/admins/cards", label: "Kartalar", icon: CreditCard, perm: "cards" },
  { href: "/admins/plans", label: "Tariflar", icon: Crown, perm: "plans" },
  { href: "/admins/promos", label: "Promo kodlar", icon: Ticket, perm: "promos" },
  { href: "/admins/domains", label: "Domenlar", icon: Globe, perm: "domains" },
  { href: "/admins/restaurants", label: "Restoranlar", icon: Store, perm: "restaurants" },
  { href: "/admins/partners", label: "Hamkorlar", icon: Handshake, perm: "partners" },
  { href: "/admins/stats", label: "Ko'rsatkichlar", icon: BarChart3, perm: "stats" },
  { href: "/admins/messages", label: "Xabarlar", icon: MessageSquare, perm: "messages" },
  { href: "/admins/admins", label: "Adminlar", icon: Users, super: true },
  { href: "/admins/settings", label: "Sozlamalar", icon: Settings },
];

export function AdminNav({
  name,
  isSuperAdmin,
  perms,
}: {
  name: string;
  isSuperAdmin: boolean;
  perms: string[] | null; // null = super (hammasi)
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Ko'rinadigan bo'limlar: super hammasini, sub-admin faqat ruxsat berilganini.
  const visibleNav = nav.filter((item) => {
    if (item.super) return isSuperAdmin;
    if (!item.perm) return true; // Bosh sahifa, Sozlamalar
    if (isSuperAdmin) return true;
    return (perms || []).includes(item.perm);
  });

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
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {visibleNav.map((item) => {
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
          <p className="text-xs text-muted">{isSuperAdmin ? "Bosh admin" : "Administrator"}</p>
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
