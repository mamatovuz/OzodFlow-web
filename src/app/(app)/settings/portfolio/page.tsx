import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PortfolioManager } from "@/app/(app)/settings/portfolio/portfolio-manager";
import { SkillManager } from "@/app/(app)/settings/portfolio/skill-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import {
  listAvailableSkills,
  listMySkills,
  listPortfolio,
} from "@/lib/portfolio";

export default async function PortfolioSettingsPage() {
  const user = await requireUser("/settings/portfolio");

  // Mijozda portfolio yo'q — uni bu sahifaga qo'yib yuborishning ma'nosi
  // yo'q. 403 emas, profil sozlamalariga yo'naltiramiz: u yerda unga
  // kerakli narsa bor.
  if (user.role !== UserRole.DEVELOPER) {
    redirect("/settings/profile");
  }

  const t = await getTranslations("settings");

  const [works, mySkills, allSkills] = await Promise.all([
    listPortfolio(user.id),
    listMySkills(user.id),
    listAvailableSkills(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
        {t("portfolio.intro")}
      </p>

      {/* ── Ko'nikmalar ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("portfolio.skillsTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <SkillManager
            skills={mySkills.map((skill) => ({
              skillId: skill.skillId,
              name: skill.name,
              level: skill.level,
              // Yil matni SERVERDA yasaladi — ICU `plural` uchun
              // klientda `next-intl` konteksti kerak bo'lardi.
              yearsLabel: t("portfolio.skillYearsShort", {
                years: skill.yearsExperience,
              }),
            }))}
            options={allSkills}
            labels={{
              empty: t("portfolio.skillsEmpty"),
              hint: t("portfolio.skillsHint"),
              select: t("portfolio.skillSelect"),
              selectPlaceholder: t("portfolio.skillSelectPlaceholder"),
              level: t("portfolio.skillLevel"),
              years: t("portfolio.skillYears"),
              add: t("portfolio.skillAdd"),
              remove: t("portfolio.skillRemove"),
              levels: {
                1: t("portfolio.skillLevel1"),
                2: t("portfolio.skillLevel2"),
                3: t("portfolio.skillLevel3"),
                4: t("portfolio.skillLevel4"),
                5: t("portfolio.skillLevel5"),
              },
            }}
          />
        </CardContent>
      </Card>

      {/* ── Ishlar ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
            <span>{t("portfolio.worksTitle")}</span>
            <span className="text-[13px] font-normal text-muted-foreground">
              {t("portfolio.worksCount", { count: works.length, max: 24 })}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <PortfolioManager
            works={works}
            labels={{
              empty: t("portfolio.worksEmpty"),
              addTitle: t("portfolio.addTitle"),
              title: t("portfolio.workTitle"),
              titlePlaceholder: t("portfolio.workTitlePlaceholder"),
              description: t("portfolio.workDescription"),
              descriptionHint: t("portfolio.workDescriptionHint"),
              url: t("portfolio.workUrl"),
              urlHint: t("portfolio.workUrlHint"),
              tech: t("portfolio.workTech"),
              techHint: t("portfolio.workTechHint"),
              year: t("portfolio.workYear"),
              add: t("portfolio.workAdd"),
              save: t("portfolio.workSave"),
              edit: t("portfolio.workEdit"),
              cancel: t("portfolio.workEditCancel"),
              remove: t("portfolio.workDelete"),
              hide: t("portfolio.workHide"),
              show: t("portfolio.workShow"),
              hidden: t("portfolio.workHidden"),
              fromProject: t("portfolio.workFromProject"),
              fromProjectHint: t("portfolio.workFromProjectHint"),
              moveUp: t("portfolio.moveUp"),
              moveDown: t("portfolio.moveDown"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
