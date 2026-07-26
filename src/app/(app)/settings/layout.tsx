import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  SettingsNav,
  type SettingsTabKey,
} from "@/app/(app)/settings/settings-nav";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Sozlamalar",
  robots: { index: false, follow: false },
};

/**
 * SOZLAMALAR QOBIG'I
 *
 * Bo'limlar ALOHIDA MARSHRUT (tab emas): shunda har bo'limga to'g'ridan
 * havola berish mumkin ("xavfsizlik sozlamalariga o'ting" degan
 * xabarnoma ishlaydi), brauzer orqaga tugmasi kutilgandek ishlaydi va
 * har bo'lim faqat o'ziga kerakli ma'lumotni o'qiydi.
 *
 * DIQQAT: bu yerdan klient komponentga faqat MATN uzatiladi. Ikonalar
 * `settings-nav.tsx` ichida — funksiyani chegaradan o'tkazib bo'lmaydi
 * (batafsil izoh o'sha faylda).
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, user] = await Promise.all([
    getTranslations("settings"),
    // `(app)/layout.tsx` allaqachon kirishni talab qiladi, ya'ni bu
    // yerda foydalanuvchi bor. `getCurrentUser` keshlangan — qo'shimcha
    // so'rov bo'lmaydi.
    getCurrentUser(),
  ]);

  const isDeveloper = user?.role === UserRole.DEVELOPER;

  const tabs: Array<{ key: SettingsTabKey; label: string }> = [
    { key: "profile", label: t("tabProfile") },

    // Portfolio faqat mutaxassisda bor. Mijozga ko'rsatish uni bo'sh
    // sahifaga olib borardi.
    ...(isDeveloper
      ? [{ key: "portfolio" as const, label: t("tabPortfolio") }]
      : []),

    { key: "security", label: t("tabSecurity") },
    { key: "notifications", label: t("tabNotifications") },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      <SettingsNav tabs={tabs} ariaLabel={t("navAria")} />

      {children}
    </div>
  );
}
