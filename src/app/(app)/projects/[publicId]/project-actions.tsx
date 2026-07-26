"use client";

import { CircleCheckBig, Lock, RotateCcw, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  approveProjectAction,
  deliverProjectAction,
  fundEscrowAction,
  requestRevisionAction,
} from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * LOYIHA AMALLARI
 *
 * Har bir amal alohida komponent va alohida forma. Bitta katta
 * "hamma narsani qiladigan" forma yozilmadi — chunki har amalning
 * o'z tekshiruvi, o'z yuklanish holati va o'z xato xabari bor.
 *
 * Qaysi amal ko'rsatilishi SAHIFADA (server tomonda) hal qilinadi:
 * holat va rol bo'yicha. Klient faqat chizadi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Escrow to'ldirish (mijoz)
// ─────────────────────────────────────────────────────────────────────────────

export function FundEscrowPanel({
  projectId,
  amountLabel,
  hasEnoughBalance,
}: {
  projectId: string;
  amountLabel: string;
  hasEnoughBalance: boolean;
}) {
  const t = useTranslations("projects.detail");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    fundEscrowAction,
    IDLE
  );

  return (
    <Card className="border-brand/30 bg-brand-soft/20">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-brand" strokeWidth={2} aria-hidden />
          {t("fundTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {t("fundBody", { amount: amountLabel })}
        </p>

        {state.status === "error" && state.message && (
          <Alert variant="danger" className="mt-4">
            {state.message}
          </Alert>
        )}

        {state.status === "success" && state.message && (
          <Alert variant="success" className="mt-4">
            {state.message}
          </Alert>
        )}

        {/* Mablag' yetmasa tugma o'rniga hamyonga havola — foydalanuvchini
            bosib, keyin xato ko'rishga majburlash yomon tajriba. */}
        {!hasEnoughBalance && state.status !== "success" ? (
          <div className="mt-4 flex flex-col gap-3">
            <Alert variant="warning">{t("fundInsufficient")}</Alert>
            <Button asChild variant="brand">
              <Link href="/wallet">
                <Wallet className="size-4" strokeWidth={2} aria-hidden />
                {t("topUp")}
              </Link>
            </Button>
          </div>
        ) : (
          state.status !== "success" && (
            <form action={formAction} className="mt-4">
              <input type="hidden" name="projectId" value={projectId} />
              <Button type="submit" variant="brand" block loading={isPending}>
                <Lock className="size-4" strokeWidth={2} aria-hidden />
                {t("fundCta")} — {amountLabel}
              </Button>
            </form>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ishni topshirish (developer)
// ─────────────────────────────────────────────────────────────────────────────

export function DeliverPanel({ projectId }: { projectId: string }) {
  const t = useTranslations("projects.detail");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    deliverProjectAction,
    IDLE
  );

  if (state.status === "success") {
    return (
      <Alert variant="success" title={t("deliverCta")}>
        {state.message}
      </Alert>
    );
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader className="border-b-0 pb-0">
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-brand" strokeWidth={2} aria-hidden />
          {t("deliverTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {state.status === "error" && state.message && (
          <Alert variant="danger" className="mb-4">
            {state.message}
          </Alert>
        )}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="projectId" value={projectId} />

          <Field name="message" label={t("deliverTitle")} errors={fieldErrors?.message} required>
            {(field) => (
              <Textarea {...field} rows={4} placeholder={t("deliverPlaceholder")} maxLength={2000} />
            )}
          </Field>

          <Button type="submit" variant="brand" loading={isPending}>
            <Send className="size-4" strokeWidth={2} aria-hidden />
            {t("deliverCta")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Qabul qilish / tuzatish (mijoz)
// ─────────────────────────────────────────────────────────────────────────────

export function ReviewPanel({
  projectId,
  revisionsLeft,
}: {
  projectId: string;
  revisionsLeft: number;
}) {
  const t = useTranslations("projects.detail");

  const [approveState, approveAction, approvePending] = useActionState<
    FormState,
    FormData
  >(approveProjectAction, IDLE);

  const [revisionState, revisionAction, revisionPending] = useActionState<
    FormState,
    FormData
  >(requestRevisionAction, IDLE);

  if (approveState.status === "success") {
    return (
      <Alert variant="success" title={t("completedTitle")}>
        {approveState.message}
      </Alert>
    );
  }

  if (revisionState.status === "success") {
    return <Alert variant="info">{revisionState.message}</Alert>;
  }

  const revisionErrors =
    revisionState.status === "error" ? revisionState.fieldErrors : undefined;

  return (
    <Card className="border-warning/30 bg-warning-soft/20">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle>{t("reviewTitle")}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-4">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {t("reviewBody")}
        </p>

        {approveState.status === "error" && approveState.message && (
          <Alert variant="danger">{approveState.message}</Alert>
        )}

        {/* Qabul qilish — asosiy harakat, tepada turadi */}
        <form action={approveAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="submit" variant="success" block loading={approvePending}>
            <CircleCheckBig className="size-4" strokeWidth={2} aria-hidden />
            {t("approveCta")}
          </Button>
        </form>

        {/* Tuzatish so'rash — ikkilamchi, `<details>` ichida yig'ilgan.
            Ochiq turgan katta forma foydalanuvchini tuzatish so'rashga
            undab qo'yardi, holbuki asosiy yo'l — qabul qilish. */}
        <details className="group border-t border-border pt-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
            {t("revisionCta")}
            <span className="ml-auto text-[13px] font-normal">
              {t("revisionsLeft", { count: Math.max(0, revisionsLeft) })}
            </span>
          </summary>

          <form action={revisionAction} className="mt-4 flex flex-col gap-3" noValidate>
            <input type="hidden" name="projectId" value={projectId} />

            {revisionState.status === "error" && revisionState.message && (
              <Alert variant="danger">{revisionState.message}</Alert>
            )}

            <Field
              name="reason"
              label={t("revisionCta")}
              errors={revisionErrors?.reason}
              required
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  placeholder={t("revisionPlaceholder")}
                  maxLength={2000}
                />
              )}
            </Field>

            <Button type="submit" variant="secondary" loading={revisionPending}>
              {t("revisionCta")}
            </Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
