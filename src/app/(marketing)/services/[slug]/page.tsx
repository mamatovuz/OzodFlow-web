import { ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readStringList } from "@/lib/json-field";
import { formatMoney } from "@/lib/money";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

/** Barcha faol kategoriyalar oldindan yasaladi — SEO uchun muhim. */
export async function generateStaticParams() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    return [];
  }
}

async function loadCategory(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      seoTitle: true,
      seoDescription: true,
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          basePrice: true,
          deliveryDays: true,
          includesJson: true,
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);

  if (!category) {
    return { title: "Xizmat topilmadi", robots: { index: false } };
  }

  const title = category.seoTitle || category.name;
  const description =
    category.seoDescription ||
    category.description ||
    `${category.name} bo'yicha xizmatlar — OzodFlow.`;

  return {
    title,
    description,
    alternates: { canonical: `/services/${category.slug}` },
    openGraph: { title, description, url: `${SITE.url}/services/${category.slug}` },
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await loadCategory(slug);

  if (!category) notFound();

  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="container-content py-14 sm:py-20">
          {/* Non ushlagichlar — foydalanuvchi qayerdaligini biladi va
              Google sayt tuzilishini tushunadi. */}
          <nav aria-label="Non ushlagich" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  Bosh sahifa
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href="/services"
                  className="transition-colors hover:text-foreground"
                >
                  Xizmatlar
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-foreground">{category.name}</li>
            </ol>
          </nav>

          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
              <Icon name={category.icon} className="size-6" />
            </span>

            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-balance sm:text-4xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="brand">
              <Link href="/projects/new">
                Loyiha joylashtirish
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/developers">Mutaxassislarni ko&apos;rish</Link>
            </Button>
          </div>

          {category.children.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2">
              {category.children.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={`/services/${child.slug}`}
                    className="inline-flex rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="container-content py-12 sm:py-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {category.services.map((service) => {
            const includes = readStringList(
              service.includesJson,
              `service:${service.id}`
            );

            return (
              <li
                key={service.id}
                className="surface-highlight flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs"
              >
                <h2 className="font-display text-[17px] font-semibold leading-snug">
                  {service.title}
                </h2>

                {service.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {service.description}
                  </p>
                )}

                {includes.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {includes.map((item) => (
                      <li key={item}>
                        <Badge variant="neutral" size="sm">
                          {item}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-[13px] text-muted-foreground">
                  {service.basePrice > 0n && (
                    <span>
                      <span className="amount font-medium text-foreground">
                        {formatMoney(service.basePrice)}
                      </span>{" "}
                      dan
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {service.deliveryDays} kundan
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
