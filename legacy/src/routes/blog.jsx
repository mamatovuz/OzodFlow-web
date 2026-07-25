import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { getInitialTheme, setStoredTheme } from "@/lib/theme";

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
});

function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-muted-foreground transition hover:border-accent hover:text-accent"
      aria-label="Tungi rejim"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function BlogLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="OzodFlow" className="h-9 w-9 rounded-lg shadow-card" />
            <span className="font-display text-xl font-bold tracking-tight">OzodFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Bosh sahifa
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-muted-foreground md:px-6">
          © {new Date().getFullYear()} OzodFlow. Barcha huquqlar himoyalangan.
        </div>
      </footer>
    </div>
  );
}
