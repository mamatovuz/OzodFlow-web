import { Monitor } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ChangeEmailForm } from "@/app/(app)/settings/security/change-email-form";
import { ChangePasswordForm } from "@/app/(app)/settings/security/change-password-form";
import { DeviceList } from "@/app/(app)/settings/security/device-list";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditableProfile, listDevices } from "@/lib/account";
import { requireUser } from "@/lib/auth/current-user";

export default async function SecuritySettingsPage() {
  const user = await requireUser("/settings/security");
  const t = await getTranslations("settings");

  const [profile, devices] = await Promise.all([
    getEditableProfile(user.id),
    listDevices(user.id, user.sessionId),
  ]);

  if (!profile) {
    return <Alert variant="danger">{t("loadFailed")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Parol ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("security.passwordTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          {profile.hasPassword ? (
            <ChangePasswordForm
              labels={{
                currentPassword: t("security.currentPassword"),
                newPassword: t("security.newPassword"),
                newPasswordHint: t("security.newPasswordHint"),
                confirmPassword: t("security.confirmPassword"),
                warning: t("security.passwordWarning"),
                submit: t("security.changePassword"),
              }}
            />
          ) : (
            /**
             * Parolsiz hisob: OTP yoki Telegram bilan kirgan.
             *
             * "O'zgartirish" formasini ko'rsatish adashtiradi — u
             * "hozirgi parol" so'raydi, lekin parol yo'q. Parolni tiklash
             * oqimi esa aynan shu holat uchun ishlaydi.
             */
            <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
              {t("security.noPassword")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Email ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("security.emailTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <ChangeEmailForm
            email={profile.email}
            emailVerified={profile.emailVerified}
            canChange={profile.hasPassword}
            labels={{
              verified: t("security.emailVerified"),
              notVerified: t("security.emailNotVerified"),
              needsPassword: t("security.emailNeedsPassword"),
              newEmail: t("security.newEmail"),
              emailPlaceholder: t("security.emailPlaceholder"),
              password: t("security.passwordForEmail"),
              passwordHint: t("security.passwordForEmailHint"),
              submit: t("security.changeEmail"),
            }}
          />
        </CardContent>
      </Card>

      {/* ── Qurilmalar ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor
              className="size-4 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            {t("security.devicesTitle")}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <DeviceList
            // Vaqt matni SERVERDA yasaladi. Klientda hisoblash ikki
            // muammo tug'diradi: ICU `plural` uchun `next-intl`
            // konteksti kerak bo'ladi, va server bilan klient soati
            // farq qilsa hidratsiya nomuvofiqligi chiqadi.
            devices={devices.map((device) => ({
              id: device.id,
              name: device.device,
              ip: device.ip,
              isCurrent: device.isCurrent,
              lastUsedLabel: relativeTime(device.lastUsedAt, t),
            }))}
            labels={{
              empty: t("security.noDevices"),
              current: t("security.currentDevice"),
              unknownIp: t("security.unknownIp"),
              revoke: t("security.revoke"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * "2 soat oldin" ko'rinishidagi vaqt.
 *
 * `Intl.RelativeTimeFormat` ATAYLAB ishlatilmadi: u o'zbek tili uchun
 * to'liq ma'lumotga ega emas va natija muhitga qarab o'zgaradi.
 * ICU `plural` esa `messages/uz.json` da — tarjima qilinadigan joyda.
 */
function relativeTime(
  date: Date,
  t: Awaited<ReturnType<typeof getTranslations<"settings">>>
): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return t("security.justNow");
  if (minutes < 60) return t("security.minutesAgo", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("security.hoursAgo", { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t("security.daysAgo", { count: days });

  return date.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
