import {
  BadgeCheck,
  ExternalLink,
  FolderOpen,
  Github,
  Languages,
  Linkedin,
  MapPin,
  MessageSquareQuote,
  Send,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import {
  getDeveloperProfile,
  listPublicUsernames,
  type DeveloperProfilePage,
} from "@/lib/queries/developers";
import { SITE, developerProfileUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * OMMAVIY MUTAXASSIS PROFILI — ozodflow.uz/dev/username
 *
 * Bu sahifa SEO uchun eng muhim: mutaxassis o'z havolasini ulashadi,
 * mijozlar Google'dan izlaydi. Shuning uchun:
 *   • to'liq server tomonda chiziladi (SSR/ISR)
 *   • Open Graph va `Person` schema.org bilan
 *   • statik yasaladi (`generateStaticParams`)
 */

export const revalidate = 900;

/**
 * Mavjud profillarni oldindan yasaydi.
 *
 * `dynamicParams` standart holatda `true` — ro'yxatda bo'lmagan yangi
 * profil ham ochiladi (birinchi so'rovda yasaladi), shuning uchun yangi
 * mutaxassis deploy'ni kutmaydi.
 */
export async function generateStaticParams() {
  try {
    const usernames = await listPublicUsernames();
    return usernames.map((username) => ({ username }));
  } catch {
    // Build vaqtida database bo'lmasligi mumkin — sahifalar so'rov
    // paytida yasaladi.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getDeveloperProfile(username);

  if (!profile) {
    return { title: "Mutaxassis topilmadi", robots: { index: false } };
  }

  const title = profile.seoTitle || `${profile.name} — ${profile.headline ?? "mutaxassis"}`;
  const description =
    profile.seoDescription ||
    profile.bio?.slice(0, 160) ||
    `${profile.name} — OzodFlow'da tekshirilgan mutaxassis. ` +
      `${profile.completedProjects} ta bajarilgan loyiha.`;

  return {
    title,
    description,
    alternates: { canonical: `/dev/${profile.username}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: developerProfileUrl(profile.username),
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
  };
}

export default async function DeveloperProfilePageView({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getDeveloperProfile(username);

  if (!profile) notFound();

  const t = await getTranslations("profile");
  const tLevels = await getTranslations("levels");
  const tDev = await getTranslations("developers");

  return (
    <>
      {/* ── Muqova ────────────────────────────────────────────────────────
          Rasm bo'lmasa brend gradienti — bo'sh kulrang blokdan yaxshiroq. */}
      <div className="relative h-40 w-full sm:h-56">
        {profile.coverUrl ? (
          <Image
            src={profile.coverUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="size-full bg-gradient-brand" />
        )}
      </div>

      <div className="container-content">
        {/* ── Sarlavha ──────────────────────────────────────────────────── */}
        <header className="-mt-12 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="rounded-full border-4 border-background bg-background">
            <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
          </div>

          <div className="min-w-0 flex-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
                {profile.name}
              </h1>

              <Badge variant="brand" size="sm">
                {tLevels.has(profile.level) ? tLevels(profile.level) : profile.level}
              </Badge>

              <Badge variant="success" size="sm" className="gap-1">
                <BadgeCheck className="size-3.5" strokeWidth={2.5} aria-hidden />
                {t("verified")}
              </Badge>

              {profile.isAvailable && (
                <Badge variant="info" size="sm" className="gap-1.5">
                  <StatusDot className="bg-info" animate />
                  {tDev("available")}
                </Badge>
              )}
            </div>

            {profile.headline && (
              <p className="mt-1.5 text-[15px] text-muted-foreground text-pretty">
                {profile.headline}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
                  {profile.location}
                </span>
              )}

              {profile.hourlyRate > 0n && (
                <span>
                  {tDev("hourlyRate")}:{" "}
                  <span className="amount text-foreground">
                    {formatMoney(profile.hourlyRate)}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:pb-2">
            <Button asChild variant="brand">
              <Link href={`/projects/new?dev=${profile.username}`}>{t("hire")}</Link>
            </Button>
          </div>
        </header>

        {/* ── Ko'rsatkichlar ────────────────────────────────────────────── */}
        <StatsRow profile={profile} />

        <div className="grid gap-6 py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* ── Chap ustun ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("about")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            <Card>
              <CardHeader>
                <CardTitle>{t("portfolio")}</CardTitle>
              </CardHeader>

              {profile.portfolio.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title={t("noPortfolio")}
                  description={t("noPortfolioBody")}
                />
              ) : (
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {profile.portfolio.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1"
                    >
                      {item.coverUrl && (
                        <div className="relative aspect-[16/10] w-full">
                          <Image
                            src={item.coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 400px"
                          />
                        </div>
                      )}

                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-display text-[15px] font-semibold leading-snug">
                          {item.title}
                          {/* Yil — ish qanchalik yangi ekanini
                              ko'rsatadi. Avval olinib ishlatilmagan. */}
                          {item.year && (
                            <span className="ml-1.5 font-sans text-[13px] font-normal text-muted-foreground">
                              {item.year}
                            </span>
                          )}
                        </h3>

                        {item.description && (
                          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        )}

                        {item.tech.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {item.tech.map((tech) => (
                              <li key={tech}>
                                <Badge variant="neutral" size="sm">
                                  {tech}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
                          >
                            {t("viewWork")}
                            <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Sharhlar */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("reviews")}
                  {profile.ratingCount > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      ({profile.ratingCount})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              {profile.reviews.length === 0 ? (
                <EmptyState
                  icon={MessageSquareQuote}
                  title={t("noReviews")}
                  description={t("noReviewsBody")}
                />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {profile.reviews.map((review) => (
                    <li key={review.id} className="p-5 sm:p-6">
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={review.authorName}
                          src={review.authorAvatar}
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {review.authorName}
                            </span>
                            <Stars rating={review.rating} />
                          </div>

                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {review.projectTitle} ·{" "}
                            {review.createdAt.toLocaleDateString("uz-UZ", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>

                          {review.comment && (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {review.comment}
                            </p>
                          )}

                          {review.reply && (
                            <div className="mt-3 rounded-lg border-l-2 border-brand bg-surface-1 p-3">
                              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                {t("reply")}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {review.reply}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ── O'ng ustun ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {profile.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("skills")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {groupSkills(profile.skills).map(([kind, skills]) => (
                    <div key={kind}>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t.has(`skillKind.${kind}`)
                          ? t(`skillKind.${kind}` as "skillKind.OTHER")
                          : kind}
                      </p>

                      {/* DARAJA KO'RSATILADI.
                          Mutaxassis o'zini 1-5 ballda baholaydi va bu
                          ma'lumot avval olinib, ishlatilmay tashlanardi.
                          Mijoz uchun "React" va "React (5/5)" farqi
                          katta — tanlashda aynan shu ma'lumot kerak. */}
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {skills.map((skill) => (
                          <li
                            key={skill.name}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0 truncate text-sm">
                              {skill.name}
                            </span>

                            <span
                              className="flex shrink-0 gap-0.5"
                              title={t("skillLevel", { level: skill.level })}
                            >
                              {[1, 2, 3, 4, 5].map((step) => (
                                <span
                                  key={step}
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    step <= skill.level
                                      ? "bg-brand"
                                      : "bg-border"
                                  )}
                                  aria-hidden
                                />
                              ))}
                              <span className="sr-only">
                                {t("skillLevel", { level: skill.level })}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Tillar ──────────────────────────────────────────────────
                Bu ma'lumot avval olinib, sahifada UMUMAN ko'rsatilmagan
                edi. Mijoz uchun muhim: u mutaxassis bilan qaysi tilda
                gaplashishini bilishi kerak. */}
            {profile.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages
                      className="size-4 text-muted-foreground"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {t("languages")}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <ul className="flex flex-col gap-1.5">
                    {profile.languages.map((language) => (
                      <li
                        key={language.code}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span>
                          {/* Tarjima yo'q bo'lsa ISO kodi ko'rsatiladi —
                              yangi til qo'shilsa sahifa yiqilmasligi
                              kerak. */}
                          {t.has(`languageName.${language.code}` as "languageName.uz")
                            ? t(`languageName.${language.code}` as "languageName.uz")
                            : language.code.toUpperCase()}
                        </span>

                        <span className="text-[13px] text-muted-foreground">
                          {t.has(
                            `proficiency.${language.proficiency}` as "proficiency.NATIVE"
                          )
                            ? t(
                                `proficiency.${language.proficiency}` as "proficiency.NATIVE"
                              )
                            : language.proficiency.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {profile.badges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("badges")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {profile.badges.map((badge) => (
                    <div key={badge.slug} className="flex items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-soft-foreground">
                        <Star className="size-4" strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{badge.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {profile.certificates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("certificates")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {profile.certificates.map((certificate) => (
                    <div key={certificate.id}>
                      <p className="text-sm font-medium">{certificate.title}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {certificate.issuer}
                        {certificate.issuedAt &&
                          ` · ${certificate.issuedAt.getFullYear()}`}
                        {certificate.verified && " · tasdiqlangan"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tashqi havolalar */}
            {(profile.githubUrl || profile.linkedinUrl || profile.telegramUsername) && (
              <Card>
                <CardContent className="flex flex-col gap-2">
                  {/* `nofollow` — profil egasining tashqi havolasi bizning
                      SEO vaznimizni olib ketmasligi kerak. */}
                  {profile.githubUrl && (
                    <ExternalLinkRow
                      href={profile.githubUrl}
                      icon={Github}
                      label="GitHub"
                    />
                  )}
                  {profile.linkedinUrl && (
                    <ExternalLinkRow
                      href={profile.linkedinUrl}
                      icon={Linkedin}
                      label="LinkedIn"
                    />
                  )}
                  {profile.telegramUsername && (
                    <ExternalLinkRow
                      href={`https://t.me/${profile.telegramUsername.replace(/^@/, "")}`}
                      icon={Send}
                      label="Telegram"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <PersonStructuredData profile={profile} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Qismlar
// ─────────────────────────────────────────────────────────────────────────────

async function StatsRow({ profile }: { profile: DeveloperProfilePage }) {
  const t = await getTranslations("profile.stats");

  const items = [
    profile.ratingCount > 0 && {
      label: t("rating"),
      value: profile.ratingAvg.toFixed(1).replace(".", ","),
    },
    { label: t("projects"), value: String(profile.completedProjects) },
    profile.successRate > 0 && {
      label: t("successRate"),
      value: `${Math.round(profile.successRate)}%`,
    },
    profile.avgResponseMinutes !== null && {
      label: t("responseTime"),
      value:
        profile.avgResponseMinutes < 60
          ? t("minutesShort", { minutes: profile.avgResponseMinutes })
          : t("hoursShort", { hours: Math.round(profile.avgResponseMinutes / 60) }),
    },
    profile.yearsExperience > 0 && {
      label: t("experience"),
      value: t("yearsShort", { years: profile.yearsExperience }),
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  if (items.length === 0) return null;

  return (
    <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <dd className="font-sans text-xl font-semibold leading-none [font-variant-numeric:proportional-nums]">
            {item.value}
          </dd>
          <dt className="mt-1.5 text-[13px] text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} dan 5`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? "size-3.5 fill-warning text-warning"
              : "size-3.5 text-border"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

function ExternalLinkRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Github;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {label}
      <ExternalLink className="ml-auto size-3.5" strokeWidth={2} aria-hidden />
    </a>
  );
}

/** Ko'nikmalarni turi bo'yicha guruhlaydi. */
function groupSkills(
  skills: DeveloperProfilePage["skills"]
): Array<[string, DeveloperProfilePage["skills"]]> {
  const groups = new Map<string, DeveloperProfilePage["skills"]>();

  for (const skill of skills) {
    const existing = groups.get(skill.kind);
    if (existing) existing.push(skill);
    else groups.set(skill.kind, [skill]);
  }

  /**
   * Guruh ichida ENG KUCHLI ko'nikma birinchi.
   *
   * Mijoz ro'yxatning boshiga qaraydi va mutaxassis nimada kuchli
   * ekanini darhol bilishi kerak. Tasodifiy tartibda "React 2/5"
   * tepada turib qolsa bu noto'g'ri taassurot qoldiradi.
   *
   * Teng darajada — alifbo bo'yicha, shunda tartib barqaror bo'ladi
   * va sahifa qayta yasalganda o'zgarmaydi.
   */
  for (const list of groups.values()) {
    list.sort(
      (a, b) => b.level - a.level || a.name.localeCompare(b.name, "uz")
    );
  }

  return [...groups.entries()];
}

/**
 * schema.org `Person`.
 *
 * Google qidiruv natijasida mutaxassis kartochkasini shundan yasaydi:
 * ism, kasb, reyting.
 */
function PersonStructuredData({ profile }: { profile: DeveloperProfilePage }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: developerProfileUrl(profile.username),
    ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
    ...(profile.headline ? { jobTitle: profile.headline } : {}),
    ...(profile.bio ? { description: profile.bio.slice(0, 300) } : {}),
    ...(profile.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location } } : {}),
    knowsAbout: profile.skills.map((skill) => skill.name),
    worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };

  // Reyting FAQAT haqiqiy sharhlar bo'lganda beriladi. Sharhsiz
  // `aggregateRating` yozish Google qoidalarini buzadi va sayt
  // jazolanishi mumkin.
  if (profile.ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: profile.ratingAvg,
      reviewCount: profile.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
