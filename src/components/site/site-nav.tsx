"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangSwitcher } from "@/components/site/lang-switcher";
import type { SiteNavButton } from "@/lib/site";

type Labels = { blog: string; projects: string; about: string; channel: string };

export function SiteNav({
  base,
  channel,
  navButtons = [],
  hasProjects = false,
  lang = "uz",
  labels,
}: {
  base: string;
  channel: string;
  navButtons?: SiteNavButton[];
  hasProjects?: boolean;
  lang?: string;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: `${base}/blog`, label: labels.blog },
    ...(hasProjects ? [{ href: `${base}/projects`, label: labels.projects }] : []),
    { href: `${base}/about`, label: labels.about },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href={base || "/"} className="text-lg font-bold tracking-tight" onClick={() => setOpen(false)}>
          Ozodbeck
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
          {navButtons.map((b) =>
            b.external ? (
              <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground">
                {b.label}
              </a>
            ) : (
              <Link key={b.id} href={b.url} className="text-sm text-muted hover:text-foreground">
                {b.label}
              </Link>
            )
          )}
          {channel && (
            <a href={channel} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground">
              {labels.channel}
            </a>
          )}
          <LangSwitcher current={lang} />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <LangSwitcher current={lang} />
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
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm text-foreground">
              {l.label}
            </Link>
          ))}
          {navButtons.map((b) =>
            b.external ? (
              <a key={b.id} href={b.url} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm text-foreground">
                {b.label}
              </a>
            ) : (
              <Link key={b.id} href={b.url} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm text-foreground">
                {b.label}
              </Link>
            )
          )}
          {channel && (
            <a href={channel} target="_blank" rel="noreferrer" className="block rounded-lg px-2 py-2.5 text-sm text-foreground">
              {labels.channel}
            </a>
          )}
        </div>
      )}
    </header>
  );
}
