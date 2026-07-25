import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/icon";
import { Section, SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";
import type { MarketingCategory } from "@/lib/queries/marketing";

/**
 * Xizmat yo'nalishlari.
 *
 * Ma'lumot databasedan keladi — admin panelda kategoriya qo'shilsa, bosh
 * sahifa o'zi yangilanadi. Kategoriya yo'q bo'lsa bo'lim butunlay
 * ko'rsatilmaydi (bo'sh sarlavha chalg'itadi).
 */
export async function Categories({ categories }: { categories: MarketingCategory[] }) {
  const t = await getTranslations("home.categories");

  if (categories.length === 0) return null;

  return (
    <Section id="services">
      <div className="container-content">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            label={t("label")}
            title={t("title")}
            subtitle={t("subtitle")}
            align="left"
          />

          <Button asChild variant="secondary" className="shrink-0 max-sm:w-full">
            <Link href="/services">
              {t("viewAll")}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/services/${category.slug}`}
                className="group surface-highlight flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-xs transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110">
                    <Icon name={category.icon} className="size-[22px]" />
                  </span>

                  {/* Strelka faqat hover'da paydo bo'ladi — kartochka tinch
                      holatida ortiqcha element bo'lmaydi. */}
                  <ArrowUpRight
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>

                <h3 className="mt-5 font-display text-[15px] font-semibold leading-snug">
                  {category.name}
                </h3>

                {category.description && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                )}

                {/* `mt-auto` — kartochkalar turli balandlikda bo'lsa ham
                    loyiha soni pastda tekis turadi.

                    Nol bo'lsa KO'RSATILMAYDI: yangi platformada har bir
                    kartochkada "loyiha yo'q" yozuvi turishi foydali ma'lumot
                    bermaydi va ro'yxatni bo'sh ko'rsatadi. Bo'sh joy o'zi
                    `mt-auto` bilan saqlanadi, kartochka balandligi
                    o'zgarmaydi. */}
                {category.projectCount > 0 && (
                  <p className="mt-auto pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t("projectsCount", { count: category.projectCount })}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
