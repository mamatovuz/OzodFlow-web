import { MapPin, Star, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { listPublicDevelopers } from "@/lib/queries/developers";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mutaxassislar",
  description:
    "OzodFlow'dagi tekshirilgan mutaxassislar: veb, mobil, dizayn va " +
    "avtomatlashtirish bo'yicha. Portfolio, reyting va bajarilgan ishlar.",
  alternates: { canonical: "/developers" },
};

/**
 * Mutaxassislar katalogi.
 *
 * ISR: ro'yxat tez-tez o'zgarmaydi, lekin yangi tasdiqlangan mutaxassis
 * uzoq kutmasligi kerak — 10 daqiqa muvozanatli.
 */
export const revalidate = 600;

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ available?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("developers");

  const availableOnly = params.available === "1";
  const developers = await listPublicDevelopers({ availableOnly });

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

          <nav className="mt-7 flex flex-wrap gap-2" aria-label="Filtr">
            <FilterLink href="/developers" active={!availableOnly}>
              {t("filterAll")}
            </FilterLink>
            <FilterLink href="/developers?available=1" active={availableOnly}>
              {t("filterAvailable")}
            </FilterLink>
          </nav>
        </div>
      </section>

      <section className="container-content py-12 sm:py-16">
        {developers.length === 0 ? (
          <Card>
            <EmptyState
              icon={UserPlus}
              title={t("empty")}
              description={t("emptyBody")}
              action={
                <Button asChild variant="brand">
                  <Link href="/register?role=developer">{t("becomeOne")}</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {developers.map((developer) => (
              <li key={developer.username}>
                <Link
                  href={`/dev/${developer.username}`}
                  className="surface-highlight flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      name={developer.name}
                      src={developer.avatarUrl}
                      size="lg"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate font-display text-[15px] font-semibold leading-snug">
                          {developer.name}
                        </h2>

                        {developer.isAvailable && (
                          <Badge variant="success" size="sm" className="shrink-0 gap-1.5">
                            <StatusDot className="bg-success" />
                            {t("available")}
                          </Badge>
                        )}
                      </div>

                      {developer.headline && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                          {developer.headline}
                        </p>
                      )}

                      {developer.location && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                          <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
                          {developer.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                    {developer.ratingCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                        <span className="amount">
                          {developer.ratingAvg.toFixed(1).replace(".", ",")}
                        </span>
                        <span className="font-normal text-muted-foreground">
                          ({developer.ratingCount})
                        </span>
                      </span>
                    )}

                    <span className="text-muted-foreground">
                      {t("projects", { count: developer.completedProjects })}
                    </span>

                    {developer.hourlyRate > 0n && (
                      <span className="text-muted-foreground">
                        {t("hourlyRate")}:{" "}
                        <span className="amount text-foreground">
                          {formatMoney(developer.hourlyRate)}
                        </span>
                      </span>
                    )}
                  </div>

                  {developer.skills.length > 0 && (
                    <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      {developer.skills.map((skill) => (
                        <li key={skill}>
                          <Badge variant="outline" size="sm">
                            {skill}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeveloperListStructuredData count={developers.length} />
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand-soft text-brand-soft-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

/**
 * schema.org ItemList — Google ro'yxat ekanini tushunadi.
 *
 * Alohida mutaxassislarning ma'lumoti bu yerda BERILMAYDI: har
 * profilning o'z sahifasida `Person` schemasi bor va uni takrorlash
 * ortiqcha.
 */
function DeveloperListStructuredData({ count }: { count: number }) {
  if (count === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Mutaxassislar",
    url: `${SITE.url}/developers`,
    numberOfItems: count,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
