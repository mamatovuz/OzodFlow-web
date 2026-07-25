import { ArrowRight, Check, Lock, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, sumToTiyin } from "@/lib/money";

/**
 * Bosh sahifa hero bo'limi.
 *
 * Kompozitsiya ataylab assimetrik: chapda matn (7 ustun), o'ngda mahsulot
 * kartochkasi (5 ustun). Simmetrik 50/50 bo'linish statik va "shablon"
 * ko'rinadi; 60/40 esa ko'zni chapdan o'ngga tabiiy olib boradi.
 */
export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Nozik to'r fon. `pointer-events-none` — ustidagi tugmalarni bloklamaydi. */}
      <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden />

      <div className="container-content relative py-20 sm:py-28 lg:py-32">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
          {/* ── Matn ustuni ──────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <Badge variant="brand" size="lg" className="gap-2 rounded-full">
              <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
              {t("badge")}
            </Badge>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]">
              {t("title")}
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
              {t("subtitle")}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="brand" size="lg">
                <Link href="/projects/new">
                  {t("ctaPrimary")}
                  <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/developers">{t("ctaSecondary")}</Link>
              </Button>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
              {t("note")}
            </p>
          </div>

          {/* ── Mahsulot kartochkasi ─────────────────────────────────────── */}
          <div className="lg:col-span-5">
            <HeroProjectCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Hero'dagi mahsulot ko'rinishi.
 *
 * Bu SCREENSHOT EMAS — haqiqiy dizayn tokenlari bilan qurilgan HTML. Shu
 * sababli tema almashganda o'zi moslashadi, ekranda o'lchamga qarab
 * cho'ziladi va rasm yuklanishini kutmaydi.
 *
 * `aria-hidden`: bu illyustratsiya, ma'lumot manbasi emas. Ichidagi raqamlar
 * o'ylab topilgan misol, shuning uchun ekran o'quvchi ularni haqiqiy loyiha
 * deb o'qib bermasligi kerak — yonidagi matn hammasini tushuntirib beradi.
 */
async function HeroProjectCard() {
  const t = await getTranslations("home.hero.mock");
  const escrowAmount = formatMoney(sumToTiyin(4_500_000));

  const timeline = [
    { label: t("stepPosted"), done: true },
    { label: t("stepChosen"), done: true },
    { label: t("stepWorking"), done: false, current: true },
    { label: t("stepAccept"), done: false },
  ];

  return (
    <div className="relative" aria-hidden>
      {/* Kartochka ostidagi brend porlashi — kartochkani fondan ajratadi */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-brand opacity-[0.14] blur-2xl"
        aria-hidden
      />

      <div className="surface-highlight relative rounded-2xl border border-border bg-card p-5 shadow-xl">
        {/* Sarlavha qatori */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="amount text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              OZF-4F2A91
            </span>
            <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug">
              {t("projectTitle")}
            </h3>
          </div>
          <Badge variant="success" size="sm" className="shrink-0 gap-1.5">
            <StatusDot className="bg-success" animate />
            {t("escrowBadge")}
          </Badge>
        </div>

        {/* Bloklangan summa — kartochkaning asosiy xabari */}
        <div className="mt-4 rounded-xl border border-success/25 bg-success-soft/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-success-soft-foreground/80">
                {t("lockedLabel")}
              </p>
              <p className="amount mt-1 text-xl font-semibold text-success-soft-foreground">
                {escrowAmount}
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
              <Lock className="size-[18px]" strokeWidth={2} aria-hidden />
            </span>
          </div>
        </div>

        {/* Timeline */}
        <ol className="mt-5 space-y-0">
          {timeline.map((step, index) => {
            const isLast = index === timeline.length - 1;

            return (
              <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Bosqichlarni bog'lovchi chiziq. Oxirgi bosqichda chizilmaydi,
                    aks holda pastga osilib qoladi. */}
                {!isLast && (
                  <span
                    className={`absolute left-[9px] top-5 h-[calc(100%-0.75rem)] w-px ${
                      step.done ? "bg-brand/40" : "bg-border"
                    }`}
                    aria-hidden
                  />
                )}

                <span
                  className={`relative z-10 mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 ${
                    step.done
                      ? "border-brand bg-brand text-brand-foreground"
                      : step.current
                        ? "border-brand bg-card"
                        : "border-border bg-card"
                  }`}
                >
                  {step.done && <Check className="size-2.5" strokeWidth={3.5} aria-hidden />}
                  {step.current && (
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                  )}
                </span>

                <span
                  className={`text-[13px] leading-tight ${
                    step.current
                      ? "font-medium text-foreground"
                      : step.done
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {step.label}
                  {step.current && (
                    <span className="ml-2 text-[11px] font-normal text-brand">
                      {t("now")}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Mutaxassis qatori */}
        <div className="mt-5 flex items-center gap-3 border-t border-border-subtle pt-4">
          {/* Avatar o'rniga bosh harflar — tashqi rasm so'rovi bo'lmaydi */}
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-brand font-display text-[13px] font-bold text-white">
            JT
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{t("devName")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t("devRole")}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium">
            <Star className="size-3.5 fill-warning text-warning" aria-hidden />
            <span className="amount">4,9</span>
          </span>
        </div>
      </div>
    </div>
  );
}
