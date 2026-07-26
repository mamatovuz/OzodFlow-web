"use client";

import { Check, ExternalLink, FileText, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  approveApplicationAction,
  assignTestAction,
  rejectApplicationAction,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { ApplicationStatus } from "@/lib/enums";
import { IDLE, type FormState } from "@/lib/validators/form";

export type ApplicationCardView = {
  id: string;
  status: string;
  statusLabel: string;
  fullName: string;
  email: string;
  phone: string;
  experienceLabel: string;
  skills: string[];
  github: string | null;
  portfolio: string | null;
  motivation: string | null;
  score: number | null;
  passedTest: boolean | null;
  submittedLabel: string | null;
  answersLabel: string;
  answerCount: number;
};

export type ApplicationCardLabels = {
  experience: string;
  skills: string;
  motivation: string;
  links: string;
  score: string;
  scoreManual: string;
  submittedAt: string;
  assignTest: string;
  viewAnswers: string;
  cancel: string;
  approve: string;
  approveNotes: string;
  approveWarning: string;
  reject: string;
  rejectReason: string;
  rejectReasonHint: string;
};

/**
 * Bitta ariza — ko'rib chiqish kartasi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  RAD ETISH FORMASI YASHIRIN
 *
 *  "Rad etish" tugmasi darhol rad etmaydi — u sabab yozadigan maydonni
 *  ochadi. Sababsiz rad etish foydalanuvchiga hech narsa bermaydi va u
 *  nima qilishni bilmaydi.
 *
 *  Tasdiqlash ham ogohlantirish bilan: bu amal profilni OMMAVIY qiladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function ApplicationCard({
  application,
  labels,
}: {
  application: ApplicationCardView;
  labels: ApplicationCardLabels;
}) {
  const [rejecting, setRejecting] = useState(false);

  const [assignState, assignAction, isAssigning] = useActionState<
    FormState,
    FormData
  >(assignTestAction, IDLE);

  const [approveState, approveAction, isApproving] = useActionState<
    FormState,
    FormData
  >(approveApplicationAction, IDLE);

  const [rejectState, rejectAction, isRejecting] = useActionState<
    FormState,
    FormData
  >(rejectApplicationAction, IDLE);

  const error =
    (assignState.status === "error" && assignState.message) ||
    (approveState.status === "error" && approveState.message) ||
    (rejectState.status === "error" && rejectState.message) ||
    null;

  const canAssignTest =
    application.status === ApplicationStatus.SUBMITTED ||
    application.status === ApplicationStatus.UNDER_REVIEW;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* ── Sarlavha ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-[-0.01em]">
              {application.fullName}

              <Badge
                variant={
                  application.status === ApplicationStatus.TEST_SUBMITTED
                    ? "brand"
                    : "warning"
                }
                size="sm"
              >
                {application.statusLabel}
              </Badge>
            </p>

            <p className="mt-1 text-[13px] text-muted-foreground">
              {application.email}
              {" · "}
              {application.phone}
              {" · "}
              {labels.experience}: {application.experienceLabel}
            </p>

            {application.submittedLabel && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {labels.submittedAt}: {application.submittedLabel}
              </p>
            )}
          </div>

          {/* Test bali */}
          {application.score !== null && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {labels.score}
              </p>
              <p className="amount font-display text-2xl font-bold">
                {application.score}%
              </p>
              {application.passedTest === null && (
                <p className="text-[11px] text-muted-foreground">
                  {labels.scoreManual}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Ko'nikmalar ───────────────────────────────────────────── */}
        {application.skills.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {labels.skills}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {application.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-border-subtle bg-surface-1 px-1.5 py-0.5 text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Havolalar ─────────────────────────────────────────────── */}
        {(application.github || application.portfolio) && (
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {labels.links}
            </p>
            <div className="flex flex-wrap gap-3">
              {[application.github, application.portfolio]
                .filter((url): url is string => url !== null)
                .map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-[13px] text-muted-foreground underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                  >
                    <ExternalLink
                      className="size-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {url}
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* ── Motivatsiya ───────────────────────────────────────────── */}
        {application.motivation && (
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {labels.motivation}
            </p>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-pretty">
              {application.motivation}
            </p>
          </div>
        )}

        {/* Test javoblari soni — batafsil ko'rish alohida sahifada */}
        {application.answerCount > 0 && (
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <FileText className="size-3.5" strokeWidth={2} aria-hidden />
            {application.answersLabel}
          </p>
        )}

        {/* ── Amallar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
          {canAssignTest && (
            <form action={assignAction}>
              <input
                type="hidden"
                name="applicationId"
                value={application.id}
              />
              <Button type="submit" variant="secondary" loading={isAssigning}>
                <FileText className="size-4" strokeWidth={2} aria-hidden />
                {labels.assignTest}
              </Button>
            </form>
          )}

          {/* Tasdiqlash — ichki izoh bilan */}
          <form action={approveAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="applicationId" value={application.id} />
            <Button type="submit" variant="success" loading={isApproving}>
              <Check className="size-4" strokeWidth={2.5} aria-hidden />
              {labels.approve}
            </Button>
          </form>

          {!rejecting && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRejecting(true)}
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
              {labels.reject}
            </Button>
          )}
        </div>

        {/* Tasdiqlash ogohlantirishi — amaldan OLDIN o'qilishi kerak */}
        <Alert variant="warning">{labels.approveWarning}</Alert>

        {/* ── Rad etish formasi ─────────────────────────────────────── */}
        {rejecting && (
          <form
            action={rejectAction}
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive-soft/40 p-4"
          >
            <input type="hidden" name="applicationId" value={application.id} />

            <Field
              name="reason"
              label={labels.rejectReason}
              hint={labels.rejectReasonHint}
              errors={
                rejectState.status === "error"
                  ? rejectState.fieldErrors?.reason
                  : undefined
              }
              required
            >
              {(field) => <Textarea {...field} rows={3} maxLength={1000} />}
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="destructive" loading={isRejecting}>
                {labels.reject}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejecting(false)}
              >
                {labels.cancel}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
