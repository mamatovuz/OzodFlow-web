"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, Lock, Hash, Calendar, Command } from "lucide-react";

type Item = { slug: string; title: string; excerpt: string; coverImage?: string | null; locked?: boolean; tags?: string[] };

export function CommandPalette({
  base,
  labels,
}: {
  base: string;
  labels: { quickSearch: string; placeholder: string };
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const nav = [
    { label: "Blog", href: `${base}/blog`, icon: FileText },
    { label: "Teglar", href: `${base}/blog/tags`, icon: Hash },
    { label: "Arxiv", href: `${base}/blog/archive`, icon: Calendar },
  ];

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setItems([]);
    setActive(0);
  }, []);

  // Cmd/Ctrl+K global
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  // Qidiruv (debounce)
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/site/search?q=${encodeURIComponent(term)}`);
        const j = await res.json().catch(() => ({}));
        setItems(j?.data?.items || []);
        setActive(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(href: string) {
    close();
    router.push(href);
  }

  const results = q.trim().length >= 2 ? items.map((it) => ({ label: it.title, href: `${base}/blog/${it.slug}`, item: it })) : [];
  const showNav = q.trim().length < 2;
  const flat = showNav ? nav.map((n) => ({ href: n.href })) : results.map((r) => ({ href: r.href }));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      go(flat[active].href);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={labels.quickSearch}
        className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-xs lg:inline">{labels.quickSearch}</span>
        <span className="hidden items-center gap-0.5 rounded border border-border px-1 text-[10px] text-muted lg:flex">
          <Command className="h-2.5 w-2.5" />K
        </span>
      </button>

      {open && (
        <div className="modal-overlay fixed inset-0 z-[80] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm" onClick={close}>
          <div
            className="modal-pop w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={labels.placeholder}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="search"
                name="site-search-cmd"
                className="w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-muted/60"
              />
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
              ) : (
                <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted sm:block">ESC</kbd>
              )}
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {showNav ? (
                <>
                  <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted/70">Sahifalar</p>
                  {nav.map((n, i) => (
                    <button
                      key={n.href}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(n.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${active === i ? "bg-surface-2" : ""}`}
                    >
                      <n.icon className="h-4 w-4 text-muted" /> {n.label}
                    </button>
                  ))}
                </>
              ) : results.length === 0 && !loading ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Hech narsa topilmadi.</p>
              ) : (
                results.map((r, i) => (
                  <button
                    key={r.item.slug}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${active === i ? "bg-surface-2" : ""}`}
                  >
                    {r.item.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={r.item.coverImage} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2">
                        {r.item.locked ? <Lock className="h-4 w-4 text-muted" /> : <FileText className="h-4 w-4 text-muted" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.item.title}</span>
                      {r.item.excerpt && <span className="block truncate text-xs text-muted">{r.item.excerpt}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Klaviatura maslahatlari */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border px-1 py-0.5">↑</kbd>
                  <kbd className="rounded border border-border px-1 py-0.5">↓</kbd>
                  harakat
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border px-1 py-0.5">↵</kbd>
                  tanlash
                </span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-0.5">⌘</kbd>
                <kbd className="rounded border border-border px-1 py-0.5">K</kbd>
                yopish
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
