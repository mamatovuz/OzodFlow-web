"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui";

const links = [
  { href: "#features", label: "Imkoniyatlar" },
  { href: "#how", label: "Qanday ishlaydi" },
  { href: "#pricing", label: "Tariflar" },
  { href: "#faq", label: "Savol-javob" },
];

export function SiteNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {loggedIn ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Kirish
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Boshlash</Button>
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
            aria-label="Menyu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {loggedIn ? (
                <Link href="/dashboard">
                  <Button className="w-full">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Kirish
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full">Boshlash</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
