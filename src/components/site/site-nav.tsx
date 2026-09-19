"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Coffee, User, FolderGit2, Send, ExternalLink, Hash, Archive, Bookmark, Search, Languages, Check } from "lucide-react";
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
  tags: string;
  archive: string;
  saved: string;
};

type MoreItem = { label: string; href: string; external?: boolean; icon: React.ComponentType<{ className?: string }> };

const LANGS = [
  { key: "uz", label: "O'zbek" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const moreItems: MoreItem[] = [
    { label: labels.about, href: `${base}/about`, icon: User },
    ...(hasProjects ? [{ label: labels.projects, href: `${base}/projects`, icon: FolderGit2 }] : []),
    { label: labels.tags, href: `${base}/blog/tags`, icon: Hash },
    { label: labels.archive, href: `${base}/blog/archive`, icon: Archive },
    { label: labels.saved, href: `${base}/saved`, icon: Bookmark },
    ...(coffeeUrl ? [{ label: labels.coffee, href: `${base}/coffee`, icon: Coffee }] : []),
    ...(channel ? [{ label: labels.channel, href: channel, external: true, icon: Send }] : []),
    ...navButtons.map((b) => ({ label: b.label, href: b.url, external: b.external, icon: ExternalLink })),
  ];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => setMoreOpen(false), [pathname]);

  function pickLang(key: string) {
    document.cookie = `site_lang=${key}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setMoreOpen(false);
    router.refresh();
  }
  function openSearch() {
    setMoreOpen(false);
    window.dispatchEvent(new Event("site:search"));
  }

  return (
    <header className="w-full">
      {/* Klaviatura ⌘K uchun ko'rinmas qidiruv (tugmasiz) */}
      <CommandPalette base={base} hideTrigger labels={{ quickSearch: labels.quickSearch, placeholder: labels.searchPlaceholder }} />

      <nav className="mx-auto flex max-w-[530px] items-center justify-between px-5 pb-4 pt-10 sm:pt-14">
        <Link href={base || "/"} className="text-[19px] font-semibold tracking-tight text-foreground sm:text-[21px]">
          {brand}
        </Link>

        <div className="flex items-center gap-7 sm:gap-9">
          <Link
            href={`${base}/blog`}
            className={`text-[15px] transition-colors hover:text-foreground sm:text-base ${
              pathname === `${base}/blog` || pathname.startsWith(`${base}/blog/`) ? "text-foreground" : "text-muted"
            }`}
          >
            {labels.blog}
          </Link>

          {/* Ko'proq (More) */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[15px] text-muted transition-colors hover:text-foreground sm:text-base"
            >
              {labels.more}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card py-1.5 shadow-xl">
                {/* Qidiruv */}
                <button onClick={openSearch} className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-2">
                  <span className="flex items-center gap-2.5"><Search className="h-4 w-4 text-muted" /> {labels.quickSearch}</span>
                  <span className="hidden items-center gap-0.5 rounded border border-border px-1 text-[10px] text-muted sm:flex">⌘K</span>
                </button>

                <div className="my-1 h-px bg-border" />

                {moreItems.map((it) =>
                  it.external ? (
                    <a key={it.href + it.label} href={it.href} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-2">
                      <it.icon className="h-4 w-4 text-muted" /> {it.label}
                    </a>
                  ) : (
                    <Link key={it.href + it.label} href={it.href} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-2">
                      <it.icon className="h-4 w-4 text-muted" /> {it.label}
                    </Link>
                  )
                )}

                <div className="my-1 h-px bg-border" />

                {/* Til */}
                <p className="flex items-center gap-2 px-3.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted/70">
                  <Languages className="h-3.5 w-3.5" /> Til
                </p>
                {LANGS.map((l) => (
                  <button key={l.key} onClick={() => pickLang(l.key)} className="flex w-full items-center justify-between px-3.5 py-2 text-sm hover:bg-surface-2">
                    <span className={lang === l.key ? "font-semibold text-foreground" : "text-muted"}>{l.label}</span>
                    {lang === l.key && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
