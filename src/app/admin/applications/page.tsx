import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ApplicationCard } from "@/app/admin/applications/application-card";
import { Card, EmptyState } from "@/components/ui/card";
import { listPendingApplications } from "@/lib/application";
import { requireRole } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Mutaxassis arizalari",
  robots: { index: false, follow: false },
};

export default async function AdminApplicationsPage() {
  await requireRole(UserRole.ADMIN, "/admin/applications");

  const t = await getTranslations("admin");
  const applications = await listPendingApplications();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("applications.title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {t("applications.subtitle")}
        </p>
      </header>

      {applications.length === 0 ? (
        <Card>
          <EmptyState icon={UserCheck} title={t("applications.empty")} />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={{
                ...application,
                submittedLabel: application.submittedAt
                  ? application.submittedAt.toLocaleDateString("uz-UZ", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null,
                statusLabel: t(
                  `applications.statusLabel.${application.status}` as "applications.statusLabel.DRAFT"
                ),
                experienceLabel: t("applications.years", {
                  count: application.yearsExperience,
                }),
                answersLabel: t("applications.answers", {
                  count: application.answerCount,
                }),
              }}
              labels={{
                experience: t("applications.experience"),
                skills: t("applications.skills"),
                motivation: t("applications.motivation"),
                links: t("applications.links"),
                score: t("applications.score"),
                scoreManual: t("applications.scoreManual"),
                submittedAt: t("applications.submittedAt"),
                assignTest: t("applications.assignTest"),
                viewAnswers: t("applications.viewAnswers"),
                cancel: t("common.cancel"),
                approve: t("applications.approve"),
                approveNotes: t("applications.approveNotes"),
                approveWarning: t("applications.approveWarning"),
                reject: t("applications.reject"),
                rejectReason: t("applications.rejectReason"),
                rejectReasonHint: t("applications.rejectReasonHint"),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
