"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

// Sayt uchun dumaloq tema tugmasi (o'ng pastda, fixed) — otabek.io uslubi.
export function SiteThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Yorug'/qorong'i rejim"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_5px_15px_rgba(0,0,0,0.10)] ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95 sm:right-[45px] sm:bottom-[30px] dark:bg-neutral-800 dark:text-neutral-200 dark:ring-white/10"
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
