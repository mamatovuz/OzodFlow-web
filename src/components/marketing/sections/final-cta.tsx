import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Sahifa oxiridagi chaqiriq.
 *
 * Brend gradienti ustida — sahifa bo'ylab yig'ilgan ishonchni bitta harakatga
 * yo'naltiradi. Bunday blok sahifada faqat BITTA bo'lishi kerak, aks holda
 * "chaqiriq" o'z kuchini yo'qotadi.
 */
export async function FinalCta() {
  const t = await getTranslations("home.cta");

  return (
    <section className="container-content pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20">
        {/* Nuqtali naqsh — tekis gradient "yassi" ko'rinadi, naqsh unga
            tuzilma beradi. Chetlari mask bilan eritilgan. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
          aria-hidden
        />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-[1.14] text-white text-balance sm:text-[2.5rem]">
            {t("title")}
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/80 text-pretty sm:text-base">
            {t("subtitle")}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="border-transparent bg-white text-[oklch(0.45_0.19_265)] shadow-lg hover:bg-white/92 max-sm:w-full"
            >
              <Link href="/projects/new">
                {t("primary")}
                <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 max-sm:w-full"
            >
              <Link href="/developers">{t("secondary")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
