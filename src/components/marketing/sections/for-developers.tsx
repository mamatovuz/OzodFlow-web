import { ArrowRight, BadgeCheck, CalendarClock, Globe, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";

/**
 * Mutaxassislar uchun bo'lim.
 *
 * Ataylab TO'Q sirtda (`bg-foreground`) — sahifada bitta shunday blok bo'lsa,
 * u o'qish oqimini uzadi va "mana bu boshqa auditoriyaga" degan signal beradi.
 * Butun sahifa oq kartochkalardan iborat bo'lsa, bo'limlar bir-biriga
 * qo'shilib ketadi.
 */
export async function ForDevelopers() {
  const t = await getTranslations("home.forDevelopers");

  const benefits = [
    { key: "payment", icon: ShieldCheck },
    { key: "profile", icon: Globe },
    { key: "growth", icon: TrendingUp },
    { key: "flow", icon: CalendarClock },
  ] as const;

  return (
    <Section>
      <div className="container-content">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-14 sm:px-12 sm:py-16">
          {/* Fondagi nur — to'q sirtni jonlantiradi */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand opacity-25 blur-[100px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-brand-alt opacity-20 blur-[100px]"
            aria-hidden
          />

          <div className="relative grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* ── Sarlavha ─────────────────────────────────────────────── */}
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-background/70">
                <BadgeCheck className="size-3.5" strokeWidth={2} aria-hidden />
                {t("label")}
              </span>

              <h2 className="mt-5 font-display text-3xl font-bold leading-[1.14] text-background text-balance sm:text-[2.5rem]">
                {t("title")}
              </h2>

              <p className="mt-5 text-[15px] leading-relaxed text-background/70 text-pretty">
                {t("subtitle")}
              </p>

              {/* `flex-wrap` majburiy: `lg` da chap ustun 12 dan 5 ustunni
                  egallaydi (~470px), tugmalar esa `whitespace-nowrap` bilan
                  qisqarmaydi. O'ralmasa ikkinchi tugma o'ng ustundagi matn
                  ustiga chiqib ketadi. */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {/* To'q fonda brend tugma yo'qoladi — shuning uchun teskari
                    (och fonli) tugma ishlatiladi. */}
                <Button
                  asChild
                  size="lg"
                  className="border-transparent bg-background text-foreground shadow-lg hover:bg-background/90"
                >
                  <Link href="/apply">
                    {t("cta")}
                    <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-background/25 text-background hover:bg-background/10"
                >
                  <Link href="/apply/requirements">{t("requirements")}</Link>
                </Button>
              </div>
            </div>

            {/* ── Afzalliklar ──────────────────────────────────────────── */}
            <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-7">
              {benefits.map((benefit) => (
                <div key={benefit.key}>
                  <span className="grid size-10 place-items-center rounded-lg bg-background/10 text-background">
                    <benefit.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <dt className="mt-4 font-display text-[15px] font-semibold text-background">
                    {t(`benefits.${benefit.key}.title`)}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-background/65 text-pretty">
                    {t(`benefits.${benefit.key}.body`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Section>
  );
}
