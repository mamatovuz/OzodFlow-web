"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      aria-label="Rejimni almashtirish"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:text-foreground hover:bg-surface-2 ${className}`}
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
