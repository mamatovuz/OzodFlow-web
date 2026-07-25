import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Auth sahifalari qobig'i: kirish, ro'yxatdan o'tish, parolni tiklash.
 *
 * Marketing sarlavhasi va footeri ATAYLAB yo'q. Kirish sahifasida
 * navigatsiya bo'lsa foydalanuvchi chalg'iydi — bu sahifaning bitta
 * vazifasi bor. Faqat logotip (bosh sahifaga qaytish uchun) va tema
 * almashtirgichi qoldirilgan.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="relative flex min-h-dvh flex-col bg-hero">
      <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden />

      <header className="container-content relative flex h-16 shrink-0 items-center justify-between">
        <Logo />

        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
            <span className="max-sm:hidden">{t("backToSite")}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main"
        className="container-content relative flex flex-1 items-center justify-center py-10 sm:py-16"
      >
        {/* `max-w-md` — forma juda keng bo'lsa o'qish qiyinlashadi va
            arzon ko'rinadi. 28rem auth formalari uchun maqbul kenglik. */}
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
