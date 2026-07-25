import { CircleCheckBig, FileText, MessagesSquare, UserSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section-heading";

/**
 * "Qanday ishlaydi" — to'rt bosqich.
 *
 * Kartochkalar oddiy to'rtta ustun EMAS: har birida orqa fonda katta ochroq
 * raqam turadi. Bu ikki vazifani bajaradi — tartibni ko'rsatadi va
 * kartochkaga vizual og'irlik beradi, shu sabab qatorda "quruq" ko'rinmaydi.
 */
export async function HowItWorks() {
  const t = await getTranslations("home.howItWorks");

  const steps = [
    { key: "brief", icon: FileText },
    { key: "choose", icon: UserSearch },
    { key: "track", icon: MessagesSquare },
    { key: "accept", icon: CircleCheckBig },
  ] as const;

  return (
    <Section id="how-it-works">
      <div className="container-content">
        <SectionHeading
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
          className="mx-auto"
        />

        <ol className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.key}
              className="group surface-highlight relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
            >
              {/* Fondagi katta raqam. `select-none` — matn tanlashda ilashib
                  qolmasligi uchun. */}
              <span
                className="pointer-events-none absolute -right-1 -top-5 select-none font-display text-[6rem] font-extrabold leading-none text-foreground/[0.035] transition-colors duration-300 group-hover:text-brand/[0.07]"
                aria-hidden
              >
                {index + 1}
              </span>

              <span className="relative grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110">
                <step.icon className="size-[22px]" strokeWidth={1.75} aria-hidden />
              </span>

              <h3 className="relative mt-5 font-display text-[17px] font-semibold leading-snug">
                {t(`steps.${step.key}.title`)}
              </h3>

              <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t(`steps.${step.key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
