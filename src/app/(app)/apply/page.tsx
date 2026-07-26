import { CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ApplicationForm } from "@/app/(app)/apply/application-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyApplication } from "@/lib/application";
import { requireUser } from "@/lib/auth/current-user";
import { ApplicationStatus, UserRole } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Mutaxassis arizasi",
  robots: { index: false, follow: false },
};

export default async function ApplyPage() {
  const user = await requireUser("/apply");

  /**
   * Mijoz bu sahifada nima qilishini bilmaydi.
   *
   * Ariza faqat DEVELOPER roli uchun. Mijozni 403 ga tashlashdan ko'ra
   * kabinetiga qaytarish foydali.
   */
  if (user.role !== UserRole.DEVELOPER) {
    redirect("/dashboard");
  }

  const t = await getTranslations("apply");
  const application = await getMyApplication(user.id);

  /**
   * Ariza YUBORILGAN bo'lsa holat sahifasiga o'tkazamiz.
   *
   * Formani ko'rsatish adashtiradi: u tahrirlanmaydi va "saqlash"
   * tugmasi xato beradi. Faqat DRAFT va REJECTED tahrirlanadi.
   */
  const editable =
    application === null ||
    application.status === ApplicationStatus.DRAFT ||
    application.status === ApplicationStatus.REJECTED;

  if (!editable) {
    redirect("/apply/status");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </header>

      {/* Rad etilgan bo'lsa sabab ENG TEPADA — foydalanuvchi avval
          nimani tuzatish kerakligini bilishi kerak. */}
      {application?.status === ApplicationStatus.REJECTED &&
        application.rejectionReason && (
          <Alert variant="danger">
            <span className="font-semibold">{t("rejectionReason")}:</span>{" "}
            {application.rejectionReason}
          </Alert>
        )}

      {/* ── Nega tekshiruv bor ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck
              className="size-4 text-brand"
              strokeWidth={2}
              aria-hidden
            />
            {t("whyTitle")}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
            {t("whyBody")}
          </p>
        </CardContent>
      </Card>

      {/* ── Uch qadam ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stepsTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <ol className="flex flex-col gap-4">
            {[
              {
                icon: ClipboardList,
                title: t("step1"),
                body: t("step1Body"),
              },
              {
                icon: ClipboardList,
                title: t("step2"),
                body: t("step2Body"),
              },
              {
                icon: CheckCircle2,
                title: t("step3"),
                body: t("step3Body"),
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-semibold tabular-nums">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ── Forma ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
        </CardHeader>

        <CardContent>
          <ApplicationForm
            // Ariza bo'lmasa hisobdagi ma'lumot bilan to'ldiramiz —
            // odam bir narsani ikki marta yozmasligi kerak.
            defaults={{
              fullName: application?.fullName ?? user.name,
              phone: application?.phone ?? user.phone ?? "",
              email: application?.email ?? user.email ?? "",
              telegram: application?.telegram ?? "",
              github: application?.github ?? "",
              linkedin: application?.linkedin ?? "",
              portfolio: application?.portfolio ?? "",
              yearsExperience: application?.yearsExperience ?? 0,
              motivation: application?.motivation ?? "",
              skills: application?.skills.join(", ") ?? "",
            }}
            canSubmit={application !== null}
            labels={{
              fullName: t("fullName"),
              phone: t("phone"),
              phonePlaceholder: t("phonePlaceholder"),
              email: t("email"),
              telegram: t("telegram"),
              telegramHint: t("telegramHint"),
              github: t("github"),
              linkedin: t("linkedin"),
              portfolio: t("portfolio"),
              experience: t("experience"),
              skills: t("skills"),
              skillsHint: t("skillsHint"),
              motivation: t("motivation"),
              motivationHint: t("motivationHint"),
              save: t("save"),
              submit: t("submit"),
              submitHint: t("submitHint"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
