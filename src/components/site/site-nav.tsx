"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Coffee, User, FolderGit2, Send, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangSwitcher } from "@/components/site/lang-switcher";
import { CommandPalette } from "@/components/site/command-palette";
import type { SiteNavButton } from "@/lib/site";

type Labels = {
  blog: string;
  projects: string;
  about: string;
  channel: string;
  quickSearch: string;
  searchPlaceholder: string;
  more: string;
  coffee: string;
};

type MoreItem = { label: string; href: string; external?: boolean; icon: React.ComponentType<{ className?: string }> };

export function SiteNav({
  base,
  brand = "Blog",
  channel,
  coffeeUrl,
  navButtons = [],
  hasProjects = false,
  lang = "uz",
  labels,
}: {
  base: string;
  brand?: string;
  channel: string;
  coffeeUrl?: string;
  navButtons?: SiteNavButton[];
  hasProjects?: boolean;
  lang?: string;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false); // mobil menyu
  const [moreOpen, setMoreOpen] = useState(false); // "Ko'proq" dropdown (desktop)
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // "Ko'proq" ichidagi bo'limlar: Men haqimda, Loyihalar, Kofe + admin tugmalari
  const moreItems: MoreItem[] = [
    { label: labels.about, href: `${base}/about`, icon: User },
    ...(hasProjects ? [{ label: labels.projects, href: `${base}/projects`, icon: FolderGit2 }] : []),
    ...(coffeeUrl ? [{ label: labels.coffee, href: `${base}/coffee`, icon: Coffee }] : []),
    ...(channel ? [{ label: labels.channel, href: channel, external: true, icon: Send }] : []),
    ...navButtons.map((b) => ({ label: b.label, href: b.url, external: b.external, icon: ExternalLink })),
  ];

  // Tashqariga bosilsa dropdown yopiladi
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href={base || "/"} className="text-lg font-bold tracking-tight" onClick={() => setOpen(false)}>
          {brand}
        </Link>

        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href={`${base}/blog`}
            className={`text-sm transition-colors hover:text-foreground ${isActive(`${base}/blog`) ? "text-foreground" : "text-muted"}`}
          >
            {labels.blog}
          </Link>

          {/* Ko'proq (More) dropdown */}
          {moreItems.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
              >
                {labels.more}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card py-1.5 shadow-card">
                  {moreItems.map((it) =>
                    it.external ? (
                      <a
                        key={it.href + it.label}
                        href={it.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-2"
                      >
                        <it.icon className="h-4 w-4 text-muted" /> {it.label}
                      </a>
                    ) : (
                      <Link
                        key={it.href + it.label}
                        href={it.href}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-2"
                      >
                        <it.icon className="h-4 w-4 text-muted" /> {it.label}
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          <CommandPalette base={base} labels={{ quickSearch: labels.quickSearch, placeholder: labels.searchPlaceholder }} />
          <LangSwitcher current={lang} />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <CommandPalette base={base} labels={{ quickSearch: labels.quickSearch, placeholder: labels.searchPlaceholder }} />
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
          <Link href={`${base}/blog`} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm text-foreground">
            {labels.blog}
          </Link>
          {moreItems.map((it) =>
            it.external ? (
              <a
                key={it.href + it.label}
                href={it.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm text-foreground"
              >
                <it.icon className="h-4 w-4 text-muted" /> {it.label}
              </a>
            ) : (
              <Link
                key={it.href + it.label}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm text-foreground"
              >
                <it.icon className="h-4 w-4 text-muted" /> {it.label}
              </Link>
            )
          )}
        </div>
      )}
    </header>
  );
}
