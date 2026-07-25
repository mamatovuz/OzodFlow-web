import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <div className="flex min-h-dvh flex-col bg-hero">
      <header className="container-content flex h-16 items-center">
        <Logo />
      </header>

      <main className="container-content flex flex-1 items-center justify-center py-20">
        <div className="max-w-md text-center">
          {/* Katta "404" fon sifatida — ma'noni matn beradi, raqam bezak */}
          <p
            className="font-display text-[7rem] font-extrabold leading-none tracking-tighter text-transparent [-webkit-background-clip:text] [background-clip:text] [background-image:var(--gradient-brand)] [opacity:0.25]"
            aria-hidden
          >
            404
          </p>

          <h1 className="mt-2 font-display text-2xl font-bold">{t("title")}</h1>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            {t("body")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand">
              <Link href="/">
                <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
                {t("home")}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/developers">
                <Search className="size-4" strokeWidth={2} aria-hidden />
                {t("browse")}
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
