import { getTranslations } from "next-intl/server";

import { NotificationsForm } from "@/app/(app)/settings/notifications/notifications-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotificationPreferences } from "@/lib/account";
import { requireUser } from "@/lib/auth/current-user";
import { features } from "@/lib/env";

export default async function NotificationSettingsPage() {
  const user = await requireUser("/settings/notifications");
  const t = await getTranslations("settings");

  const prefs = await getNotificationPreferences(user.id);

  return (
    <div className="flex flex-col gap-6">
      {/**
       * SOZLANMAGAN KANALNI OSHKORA AYTAMIZ.
       *
       * Aks holda foydalanuvchi "email xabarnoma" ni yoqib qo'yadi,
       * kutadi va hech narsa kelmaydi — bu eng yomon tajriba. Halol
       * ogohlantirish yaxshiroq.
       */}
      {!features.email && (
        <Alert variant="info">{t("notifications.emailNotConfigured")}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.channelsTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <NotificationsForm
            email={prefs.email}
            telegram={prefs.telegram}
            push={prefs.push}
            sms={prefs.sms}
            quietHoursStart={prefs.quietHoursStart}
            quietHoursEnd={prefs.quietHoursEnd}
            labels={{
              channelsLegend: t("notifications.channelsLegend"),
              email: t("notifications.email"),
              emailHint: t("notifications.emailHint"),
              telegram: t("notifications.telegram"),
              // Bot sozlanmagan bo'lsa boshqa izoh — foydalanuvchi
              // nega xabar kelmayotganini bilishi kerak.
              telegramHint: features.telegram
                ? t("notifications.telegramHint")
                : t("notifications.telegramUnavailable"),
              push: t("notifications.push"),
              pushHint: t("notifications.pushHint"),
              sms: t("notifications.sms"),
              smsHint: t("notifications.smsHint"),
              quietTitle: t("notifications.quietTitle"),
              quietHint: t("notifications.quietHint"),
              quietStart: t("notifications.quietStart"),
              quietEnd: t("notifications.quietEnd"),
              save: t("notifications.save"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
