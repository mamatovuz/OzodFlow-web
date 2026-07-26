import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingRow } from "@/app/admin/settings/setting-row";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { hasRole } from "@/lib/enums";
import { SETTING_KEYS, getAllSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Platforma sozlamalari",
  robots: { index: false, follow: false },
};

/** Guruhlar ko'rsatiladigan tartib. */
const GROUP_ORDER = ["payments", "projects", "developers", "system", "growth"];

export default async function AdminSettingsPage() {
  // Ko'rish ADMIN uchun, o'zgartirish SUPER_ADMIN uchun. Admin nima
  // sozlangani ko'rishi kerak — u ish jarayonini tushunishi uchun.
  const user = await requireRole(UserRole.ADMIN, "/admin/settings");
  const t = await getTranslations("admin");

  const canEdit = hasRole(user.role, UserRole.SUPER_ADMIN);
  const settings = await getAllSettings();

  // Guruhlab chiqamiz.
  const grouped = new Map<string, typeof settings>();
  for (const setting of settings) {
    const list = grouped.get(setting.group) ?? [];
    list.push(setting);
    grouped.set(setting.group, list);
  }

  // Ma'lum guruhlar avval, qolganlari alifbo bo'yicha.
  const groups = [
    ...GROUP_ORDER.filter((group) => grouped.has(group)),
    ...[...grouped.keys()].filter((group) => !GROUP_ORDER.includes(group)).sort(),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </header>

      {!canEdit && <Alert variant="info">{t("settings.superAdminOnly")}</Alert>}

      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>
              {/* Tarjima yo'q bo'lsa xom guruh nomi — yangi guruh
                  qo'shilganda sahifa yiqilmasligi kerak. */}
              {t.has(`settings.group.${group}` as "settings.group.payments")
                ? t(`settings.group.${group}` as "settings.group.payments")
                : group}
            </CardTitle>
          </CardHeader>

          <ul className="divide-y divide-border-subtle">
            {(grouped.get(group) ?? []).map((setting) => (
              <li key={setting.key} className="px-5 py-4 sm:px-6">
                <SettingRow
                  settingKey={setting.key}
                  label={setting.label}
                  description={setting.description}
                  // Qiymat JSON matn sifatida saqlanadi.
                  rawValue={setting.value}
                  isProtected={setting.isProtected}
                  canEdit={canEdit}
                  updatedLabel={setting.updatedAt.toLocaleDateString("uz-UZ", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  labels={{
                    save: t("settings.save"),
                    protectedLabel: t("settings.protected"),
                    updatedAt: t("settings.updatedAt"),
                    // Komissiya uchun alohida ogohlantirish: uni
                    // o'zgartirish mavjud loyihalarga ta'sir qilmaydi.
                    warning:
                      setting.key === SETTING_KEYS.COMMISSION_BPS
                        ? t("settings.commissionWarning")
                        : null,
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
