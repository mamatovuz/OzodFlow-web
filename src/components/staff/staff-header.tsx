"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function StaffHeader({
  name,
  roleLabel,
  restaurantName,
}: {
  name: string;
  roleLabel: string;
  restaurantName: string;
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div>
          <p className="font-semibold text-foreground">{restaurantName}</p>
          <p className="text-xs text-muted">
            {name} · {roleLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={logout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
