import {
  CheckCircle2,
  Clock,
  FileText,
  PencilLine,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMyApplication } from "@/lib/application";
import { requireUser } from "@/lib/auth/current-user";
import { ApplicationStatus, UserRole } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ariza holati",
  robots: { index: false, follow: false },
};

/** Holatga qarab ko'rinish. */
type StatusView = {
  icon: LucideIcon;
  tone: "neutral" | "warning" | "success" | "danger";
  titleKey: string;
  bodyKey: string;
};

const VIEWS: Record<string, StatusView> = {
  [ApplicationStatus.DRAFT]: {
    icon: PencilLine,
    tone: "neutral",
    titleKey: "statusDraft",
    bodyKey: "statusDraftBody",
  },
  [ApplicationStatus.SUBMITTED]: {
    icon: Clock,
    tone: "warning",
    titleKey: "statusSubmitted",
    bodyKey: "statusSubmittedBody",
  },
  [ApplicationStatus.UNDER_REVIEW]: {
    icon: Clock,
    tone: "warning",
    titleKey: "statusUnderReview",
    bodyKey: "statusUnderReviewBody",
  },
  [ApplicationStatus.TEST_ASSIGNED]: {
    icon: FileText,
    tone: "warning",
    titleKey: "statusTestAssigned",
    bodyKey: "statusTestAssignedBody",
  },
  [ApplicationStatus.TEST_SUBMITTED]: {
    icon: Clock,
    tone: "warning",
    titleKey: "statusTestSubmitted",
    bodyKey: "statusTestSubmittedBody",
  },
  [ApplicationStatus.APPROVED]: {
    icon: CheckCircle2,
    tone: "success",
    titleKey: "statusApproved",
    bodyKey: "statusApprovedBody",
  },
  [ApplicationStatus.REJECTED]: {
    icon: XCircle,
    tone: "danger",
    titleKey: "statusRejected",
    bodyKey: "statusRejectedBody",
  },
};

export default async function ApplyStatusPage() {
  const user = await requireUser("/apply/status");

  if (user.role !== UserRole.DEVELOPER) {
    redirect("/dashboard");
  }

  const t = await getTranslations("apply");
  const application = await getMyApplication(user.id);

  // Ariza umuman yo'q — to'ldirishga yuboramiz.
  if (!application) {
    redirect("/apply");
  }

  const view = VIEWS[application.status] ?? VIEWS[ApplicationStatus.DRAFT];

  // TypeScript uchun: `VIEWS` da DRAFT albatta bor, lekin indekslash
  // `undefined` berishi mumkin (`noUncheckedIndexedAccess`).
  if (!view) redirect("/apply");

  const Icon = view.icon;

  const canEdit =
    application.status === ApplicationStatus.DRAFT ||
    application.status === ApplicationStatus.REJECTED;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("statusTitle")}
        </h1>
      </header>

      {/* ── Holat ─────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                view.tone === "success" &&
                  "bg-success-soft text-success-soft-foreground",
                view.tone === "warning" &&
                  "bg-warning-soft text-warning-soft-foreground",
                view.tone === "danger" &&
                  "bg-destructive-soft text-destructive",
                view.tone === "neutral" && "bg-surface-2 text-muted-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </span>

            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-[-0.01em]">
                {t(view.titleKey as "statusDraft")}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground text-pretty">
                {t(view.bodyKey as "statusDraftBody")}
              </p>
            </div>
          </div>

          {/* Rad etish sababi */}
          {application.status === ApplicationStatus.REJECTED &&
            application.rejectionReason && (
              <Alert variant="danger">
                <span className="font-semibold">{t("rejectionReason")}:</span>{" "}
                {application.rejectionReason}
              </Alert>
            )}

          {/* Test natijasi — faqat topshirilgandan keyin */}
          {application.score !== null && (
            <div className="flex items-baseline gap-2 rounded-lg border border-border bg-surface-1 p-3">
              <span className="text-[13px] text-muted-foreground">
                {t("scoreLabel")}:
              </span>
              <span className="amount text-lg font-semibold">
                {application.score}%
              </span>

              {/* Qo'lda baholanadigan savol bo'lsa yakuniy natija hali
                  yo'q — buni aytish shart, aks holda past ball
                  foydalanuvchini bekorga cho'chitadi. */}
              {application.passedTest === null && (
                <span className="text-[13px] text-muted-foreground">
                  ({t("scorePending")})
                </span>
              )}
            </div>
          )}

          {/* ── Keyingi qadam ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {application.testOpen && (
              <Button asChild>
                <Link href="/apply/test">{t("goToTest")}</Link>
              </Button>
            )}

            {canEdit && (
              // Test ochiq bo'lsa asosiy amal — testni boshlash, ya'ni
              // tahrirlash tugmasi susaytiriladi.
              <Button asChild variant={application.testOpen ? "ghost" : "brand"}>
                <Link href="/apply">{t("editApplication")}</Link>
              </Button>
            )}

            {application.status === ApplicationStatus.APPROVED && (
              <>
                <Button asChild>
                  <Link href="/dashboard">{t("goToDashboard")}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/settings/profile">{t("goToProfile")}</Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
