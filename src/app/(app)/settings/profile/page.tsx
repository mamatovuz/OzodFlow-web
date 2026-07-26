import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { DeveloperForm } from "@/app/(app)/settings/profile/developer-form";
import { ProfileForm } from "@/app/(app)/settings/profile/profile-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditableProfile } from "@/lib/account";
import { requireUser } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { SITE } from "@/lib/site";
import { tiyinToSum } from "@/lib/money";

export default async function ProfileSettingsPage() {
  const user = await requireUser("/settings/profile");
  const profile = await getEditableProfile(user.id);

  // `requireUser` foydalanuvchi borligini kafolatlaydi, lekin
  // `getEditableProfile` mustaqil so'rov — orada hisob o'chirilgan
  // bo'lishi nazariy jihatdan mumkin.
  if (!profile) {
    return (
      <Alert variant="danger">
        Profil ma'lumotini o'qib bo'lmadi. Sahifani yangilang.
      </Alert>
    );
  }

  const isDeveloper = user.role === UserRole.DEVELOPER;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumot</CardTitle>
        </CardHeader>

        <CardContent>
          <ProfileForm
            name={profile.name}
            username={profile.username}
            // Manzil namunasi serverda yasaladi — klientda `SITE` ni
            // import qilish keraksiz bundle qo'shadi.
            profileUrlPrefix={`${SITE.host}/dev/`}
            showUsername={isDeveloper}
          />
        </CardContent>
      </Card>

      {isDeveloper && (
        <>
          {!profile.developer?.isVerified && (
            <Alert variant="warning" icon={AlertCircle}>
              Profilingiz hali admin tomonidan tasdiqlanmagan — u ommaviy
              ro'yxatda ko'rinmaydi. Ma'lumotni to'ldirib qo'ying,
              tasdiqlangach darhol ochiladi.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mutaxassis profili</CardTitle>
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
              />
            </CardContent>
          </Card>

          {profile.username && (
            <p className="text-[13px] text-muted-foreground">
              Ommaviy profilingiz:{" "}
              <Link
                href={`/dev/${profile.username}`}
                className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
              >
                {SITE.host}/dev/{profile.username}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
