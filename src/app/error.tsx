"use client";

import { Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * Kutilmagan xato sahifasi.
 *
 * Foydalanuvchiga TEXNIK TAFSILOT KO'RSATILMAYDI — xato matni ichida
 * database so'rovi yoki fayl yo'llari bo'lishi mumkin, bu ma'lumot
 * tashqariga chiqmasligi kerak. Faqat `digest` ko'rsatiladi: yordam
 * xizmatiga aytilsa, log'dan aynan shu xatoni topish mumkin.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.server");

  useEffect(() => {
    // Serverga yuborish keyinroq qo'shiladi (Sentry yoki o'z log servisi).
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col bg-hero">
      <header className="container-content flex h-16 items-center">
        <Logo />
      </header>

      <main className="container-content flex flex-1 items-center justify-center py-20">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">{t("title")}</h1>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            {t("body")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="brand" onClick={reset}>
              <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
              {t("retry")}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">
                <Home className="size-4" strokeWidth={2} aria-hidden />
                {t("home")}
              </Link>
            </Button>
          </div>

          {error.digest && (
            <p className="mt-8 font-mono text-[11px] text-muted-foreground">
              Xato kodi: {error.digest}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
