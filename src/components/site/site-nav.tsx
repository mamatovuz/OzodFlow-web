"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav({ base, channel }: { base: string; channel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: `${base}/blog`, label: "Blog" },
    { href: `${base}/skills`, label: "Skills" },
    { href: `${base}/about`, label: "Men haqimda" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href={base || "/"} className="text-lg font-bold tracking-tight" onClick={() => setOpen(false)}>
          Ozodbek
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors hover:text-foreground ${
                isActive(l.href) ? "text-foreground" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {channel && (
            <a href={channel} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground">
              Kanal
            </a>
          )}
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Menyu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-4 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2.5 text-sm text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {channel && (
            <a
              href={channel}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg px-2 py-2.5 text-sm text-foreground"
            >
              Kanal
            </a>
          )}
        </div>
      )}
    </header>
  );
}
