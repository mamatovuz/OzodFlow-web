"use client";

import { useState } from "react";
import { Eye, Loader2, LogOut } from "lucide-react";

// "Admin ko'rinishi" banneri — admin biror foydalanuvchi paneliga parolsiz
// kirganda tepada chiqadi. Bir tugma bilan admin paneliga qaytaradi.
export function ImpersonationBanner({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);

  async function back() {
    setBusy(true);
    const res = await fetch("/api/impersonate/stop", { method: "POST" });
    const json = await res.json().catch(() => null);
    window.location.href = json?.data?.redirect || "/admins/restaurants";
  }

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Eye className="h-4 w-4" />
          </span>
          <p className="truncate text-sm font-medium">
            <span className="hidden sm:inline">Admin ko&apos;rinishi — </span>
            <b>{name}</b> panelidasiz
          </p>
        </div>
        <button
          onClick={back}
          disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/30 active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span className="whitespace-nowrap">Ortga qaytish</span>
        </button>
      </div>
    </div>
  );
}
