import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DeveloperForm } from "@/app/(app)/settings/profile/developer-form";
import { ProfileForm } from "@/app/(app)/settings/profile/profile-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditableProfile } from "@/lib/account";
import { requireUser } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { tiyinToSum } from "@/lib/money";
import { SITE_HOST } from "@/lib/site";

export default async function ProfileSettingsPage() {
  const user = await requireUser("/settings/profile");
  const t = await getTranslations("settings");

  const profile = await getEditableProfile(user.id);

  // `requireUser` foydalanuvchi borligini kafolatlaydi, lekin
  // `getEditableProfile` mustaqil so'rov — orada hisob o'chirilgan
  // bo'lishi nazariy jihatdan mumkin.
  if (!profile) {
    return <Alert variant="danger">{t("loadFailed")}</Alert>;
  }

  const isDeveloper = user.role === UserRole.DEVELOPER;
  const profileUrlPrefix = `${SITE_HOST}/dev/`;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.basicTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <ProfileForm
            name={profile.name}
            username={profile.username}
            showUsername={isDeveloper}
            // Matnlar SERVERDA tarjima qilinadi — klient komponentga
            // tayyor holda uzatiladi.
            labels={{
              name: t("profile.name"),
              username: t("profile.username"),
              usernameHint: t("profile.usernameHint", {
                prefix: profileUrlPrefix,
              }),
              usernamePlaceholder: t("profile.usernamePlaceholder"),
              urlPrefix: profileUrlPrefix,
              save: t("profile.save"),
            }}
          />
        </CardContent>
      </Card>

      {isDeveloper && (
        <>
          {!profile.developer?.isVerified && (
            <Alert variant="warning">{t("profile.notVerified")}</Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.developerTitle")}</CardTitle>
            </CardHeader>

            <CardContent>
              <DeveloperForm
                headline={profile.developer?.headline ?? ""}
                bio={profile.developer?.bio ?? ""}
                location={profile.developer?.location ?? ""}
                githubUrl={profile.developer?.githubUrl ?? ""}
                linkedinUrl={profile.developer?.linkedinUrl ?? ""}
                portfolioUrl={profile.developer?.portfolioUrl ?? ""}
                telegramUsername={profile.developer?.telegramUsername ?? ""}
                yearsExperience={profile.developer?.yearsExperience ?? 0}
                // Narx SO'MDA ko'rsatiladi — bigint klientga uzatilmaydi.
                hourlyRateSum={tiyinToSum(profile.developer?.hourlyRate ?? 0n)}
                availability={profile.developer?.availability ?? "AVAILABLE"}
                acceptingWork={profile.developer?.acceptingWork ?? true}
                languages={profile.developer?.languages ?? ["uz"]}
                labels={{
                  headline: t("profile.headline"),
                  headlineHint: t("profile.headlineHint"),
                  headlinePlaceholder: t("profile.headlinePlaceholder"),
                  bio: t("profile.bio"),
                  bioHint: t("profile.bioHint"),
                  location: t("profile.location"),
                  locationPlaceholder: t("profile.locationPlaceholder"),
                  experience: t("profile.experience"),
                  hourlyRate: t("profile.hourlyRate"),
                  hourlyRateHint: t("profile.hourlyRateHint"),
                  linksTitle: t("profile.linksTitle"),
                  github: t("profile.github"),
                  linkedin: t("profile.linkedin"),
                  website: t("profile.website"),
                  telegram: t("profile.telegram"),
                  languagesTitle: t("profile.languagesTitle"),
                  languages: {
                    uz: t("profile.langUz"),
                    ru: t("profile.langRu"),
                    en: t("profile.langEn"),
                    tr: t("profile.langTr"),
                    ar: t("profile.langAr"),
                  },
                  availability: t("profile.availability"),
                  availabilityHint: t("profile.availabilityHint"),
                  availabilityOptions: {
                    AVAILABLE: t("profile.availAvailable"),
                    BUSY: t("profile.availBusy"),
                    AWAY: t("profile.availAway"),
                  },
                  acceptingWork: t("profile.acceptingWork"),
                  acceptingWorkHint: t("profile.acceptingWorkHint"),
                  save: t("profile.save"),
                }}
              />
            </CardContent>
          </Card>

          {profile.username && (
            <p className="text-[13px] text-muted-foreground">
              {t("profile.publicUrl")}{" "}
              <Link
                href={`/dev/${profile.username}`}
                className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
              >
                {profileUrlPrefix}
                {profile.username}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
