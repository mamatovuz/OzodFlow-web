"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { THEME_STORAGE_KEY } from "@/components/theme/theme-script";
import { cn } from "@/lib/utils";

/**
 * Yorqin/qorong'i rejim almashtirgichi.
 *
 * Diqqat qilinadigan joy: bu komponent React holatini SAQLAMAYDI.
 *
 * Sababi — hydration. Server hozirgi temani bilmaydi (u localStorage'da),
 * shuning uchun `useState(theme)` bilan yozilsa server va klient turli
 * natija chizadi va React ogohlantirish beradi. Buning o'rniga ikkala
 * ikonka ham render qilinadi va qaysi biri ko'rinishini CSS `dark:` varianti
 * hal qiladi. Natija: JS holati yo'q, hydration farqi yo'q, ikonka
 * birinchi kadrdan to'g'ri.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");

  function toggle() {
    const root = document.documentElement;
    const nowDark = root.classList.toggle("dark");

    root.style.colorScheme = nowDark ? "dark" : "light";

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nowDark ? "dark" : "light");
    } catch {
      // localStorage yopiq bo'lsa tema shu sessiyada ishlaydi, esda qolmaydi.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggle")}
      title={t("toggle")}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-lg",
        "text-muted-foreground transition-colors duration-150",
        "hover:bg-surface-2 hover:text-foreground",
        className
      )}
    >
      <Sun className="size-[18px] dark:hidden" strokeWidth={1.75} aria-hidden />
      <Moon className="hidden size-[18px] dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
