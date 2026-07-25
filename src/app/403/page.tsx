import { ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kirish taqiqlangan",
  // Bu sahifa qidiruvda chiqmasligi kerak.
  robots: { index: false, follow: false },
};

/**
 * 403 — foydalanuvchi kirgan, lekin huquqi yetmaydi.
 *
 * Nega alohida sahifa (404 emas): 404 ko'rsatish "bunday sahifa yo'q"
 * degan yolg'on ma'lumot beradi va foydalanuvchi havolani noto'g'ri deb
 * o'ylab, qayta-qayta urinadi. Aniq sabab aytilsa u nima qilish
 * kerakligini tushunadi.
 */
export default async function ForbiddenPage() {
  const t = await getTranslations("forbidden");

  return (
    <div className="flex min-h-dvh flex-col bg-hero">
      <header className="container-content flex h-16 items-center">
        <Logo />
      </header>

      <main className="container-content flex flex-1 items-center justify-center py-20">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive-soft text-destructive-soft-foreground">
            <ShieldOff className="size-7" strokeWidth={1.75} aria-hidden />
          </span>

          <h1 className="mt-6 font-display text-2xl font-bold text-balance">
            {t("title")}
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            {t("body")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand">
              <Link href="/dashboard">{t("dashboard")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">{t("home")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
