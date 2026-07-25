import { ArrowRight, Star, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section-heading";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketingDeveloper } from "@/lib/queries/marketing";
import { initials } from "@/lib/utils";

/**
 * Mutaxassislar bo'limi.
 *
 * Bo'sh holat ATAYLAB saqlangan: platforma yangi bo'lsa, soxta profillar
 * ko'rsatilmaydi — buning o'rniga ariza topshirishga taklif chiqadi. Bu
 * halolroq va birinchi mutaxassislarni jalb qilishga ishlaydi.
 */
export async function Developers({ developers }: { developers: MarketingDeveloper[] }) {
  const t = await getTranslations("home.developers");
  const tLevels = await getTranslations("levels");

  return (
    <Section id="developers" className="border-y border-border bg-surface-1">
      <div className="container-content">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            label={t("label")}
            title={t("title")}
            subtitle={t("subtitle")}
            align="left"
          />

          {developers.length > 0 && (
            <Button asChild variant="secondary" className="shrink-0 max-sm:w-full">
              <Link href="/developers">
                {t("viewAll")}
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            </Button>
          )}
        </div>

        {developers.length === 0 ? (
          <EmptyState message={t("empty")} ctaLabel={t("applyCta")} />
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {developers.map((developer) => (
              <li key={developer.username}>
                <Link
                  href={`/dev/${developer.username}`}
                  className="group surface-highlight flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      name={developer.name}
                      avatarUrl={developer.avatarUrl}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-[15px] font-semibold leading-snug">
                          {developer.name}
                        </h3>
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
                    </div>
                  </div>

                  {/* Daraja va reyting */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {tLevels(developer.level)}
                    </Badge>

                    {developer.ratingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium">
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                        <span className="amount">
                          {developer.ratingAvg.toFixed(1).replace(".", ",")}
                        </span>
                        <span className="text-muted-foreground">
                          ({developer.ratingCount})
                        </span>
                      </span>
                    )}

                    <span className="text-[13px] text-muted-foreground">
                      {t("projectsDone", { count: developer.completedProjects })}
                    </span>
                  </div>

                  {/* Ko'nikmalar */}
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
      </div>
    </Section>
  );
}

/**
 * Avatar. Rasm bo'lmasa bosh harflar chiqadi — bu tashqi so'rovni
 * yo'q qiladi va "buzilgan rasm" ikonkasi ko'rinmaydi.
 */
function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-brand font-display text-sm font-bold text-white"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function EmptyState({ message, ctaLabel }: { message: string; ctaLabel: string }) {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
        <UserPlus className="size-6" strokeWidth={1.75} aria-hidden />
      </span>

      <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground text-pretty">
        {message}
      </p>

      <Button asChild variant="brand" className="mt-6">
        <Link href="/apply">
          {ctaLabel}
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
