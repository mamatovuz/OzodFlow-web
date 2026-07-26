"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Faqat MAVJUD sahifalar.
 *
 * `/blog` va `/pricing` bu yerda ATAYLAB yo'q — ular hali yozilmagan.
 * Ishlamaydigan havola foydalanuvchini 404 ga olib boradi; bo'lmagan
 * bo'limdan ko'ra yomonroq. Sahifa yozilgach shu yerga qo'shiladi.
 */
const NAV_ITEMS = [
  { href: "/services", key: "services" },
  { href: "/developers", key: "developers" },
  { href: "/how-it-works", key: "howItWorks" },
] as const;

/**
 * Ommaviy sahifalar sarlavhasi.
 *
 * Ikki detal ustida ishlangan:
 *
 *  1. Sahifa tepasida sarlavha SHAFFOF — hero gradienti uzilmaydi. Skroll
 *     boshlanishi bilan shisha fon va chegara paydo bo'ladi. Bu kontent
 *     sarlavha ostidan "o'tib ketayotgani" hissini beradi.
 *
 *  2. Mobil menyu ochilganda `overflow: hidden` qo'yilmaydi — buning o'rniga
 *     `position: fixed` panel ishlatiladi. Sabab: body skrollini bloklash
 *     iOS Safari'da sahifani yuqoriga otib yuboradi.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // `passive: true` — skroll hodisasi renderni bloklamaydi.
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sahifa almashganda menyu yopilishi kerak. Buni `useEffect` bilan
  // `pathname` ni kuzatib qilish MUMKIN EMAS — effekt ichida setState
  // chaqirish ketma-ket render zanjirini keltiradi va React linteri buni
  // to'g'ri ravishda xato deb belgilaydi. Buning o'rniga menyu havolalari
  // bosilganda o'zi yopiladi (pastdagi `closeMenu`).

  // Escape bilan yopish — klaviatura foydalanuvchisi uchun kutilgan xatti-harakat.
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || menuOpen
          ? "glass border-b"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container-content flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* ── Desktop navigatsiya ─────────────────────────────────────────── */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Asosiy menyu">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* ── O'ng tomondagi harakatlar ───────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t("login")}</Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href="/projects/new">{t("postProject")}</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
          >
            {menuOpen ? (
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Menu className="size-5" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobil menyu ──────────────────────────────────────────────────────
          Panel sarlavha ostida joylashadi. `grid-rows` animatsiyasi balandlikni
          `auto` dan `0` ga silliq o'tkazadi — `max-height` bilan qilinganida
          uzunlikni taxmin qilish kerak bo'lardi. */}
      <div
        id="mobile-menu"
        className={cn(
          "grid overflow-hidden border-t border-border/60 transition-[grid-template-rows] duration-300 ease-[var(--ease-out-quart)] lg:hidden",
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-transparent"
        )}
      >
        <nav
          className="container-content min-h-0 py-2"
          aria-label="Mobil menyu"
          // Yopiq holatda Tab bilan yashirin havolalarga o'tib ketmasligi uchun.
          // React 19 `inert` ni oddiy boolean prop sifatida qo'llaydi.
          inert={!menuOpen}
        >
          <ul className="flex flex-col py-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border/60 py-4 sm:hidden">
            <Button asChild variant="secondary" block>
              <Link href="/login" onClick={closeMenu}>
                {t("login")}
              </Link>
            </Button>
            <Button asChild variant="brand" block>
              <Link href="/projects/new" onClick={closeMenu}>
                {t("postProject")}
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
