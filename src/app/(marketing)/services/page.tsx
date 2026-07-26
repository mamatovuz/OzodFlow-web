import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/icon";
import { Card, EmptyState } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Xizmatlar",
  description:
    "OzodFlow'da buyurtma qilish mumkin bo'lgan xizmatlar: veb-saytlar, " +
    "Telegram botlar, mobil ilovalar, dizayn, SEO va avtomatlashtirish.",
  alternates: { canonical: "/services" },
};

export const revalidate = 3600;

export default async function ServicesPage() {
  const t = await getTranslations("home.categories");

  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, basePrice: true, deliveryDays: true },
      },
    },
  });

  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="container-content py-14 sm:py-20">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="container-content py-12 sm:py-16">
        {categories.length === 0 ? (
          <Card>
            <EmptyState title={t("empty")} />
          </Card>
        ) : (
          <div className="flex flex-col gap-10">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                    <Icon name={category.icon} className="size-[22px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold tracking-[-0.02em]">
                      <Link
                        href={`/services/${category.slug}`}
                        className="transition-colors hover:text-brand"
                      >
                        {category.name}
                      </Link>
                    </h2>
                    {category.description && (
                      <p className="mt-1 text-[15px] text-muted-foreground text-pretty">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {category.services.length > 0 && (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {category.services.map((service) => (
                      <li
                        key={service.id}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <p className="font-display text-[15px] font-semibold leading-snug">
                          {service.title}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                          {service.basePrice > 0n && (
                            <span>
                              <span className="amount text-foreground">
                                {formatMoney(service.basePrice)}
                              </span>{" "}
                              dan
                            </span>
                          )}
                          <span>{service.deliveryDays} kundan</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/services/${category.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-hover"
                >
                  Batafsil
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
