"use client";

import { CircleCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { submitProposalAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Taklif yuborish formasi.
 *
 * Faqat OCHIQ loyihada va faqat hali taklif yubormagan developerga
 * ko'rsatiladi — bu qaror SAHIFADA (serverda) qabul qilinadi.
 */
export function ProposalForm({
  projectId,
  budgetRange,
}: {
  projectId: string;
  /** Serverda formatlangan byudjet oralig'i */
  budgetRange: string;
}) {
  const t = useTranslations("projects.detail");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    submitProposalAction,
    IDLE
  );

  if (state.status === "success") {
    return (
      <Card className="border-success/25 bg-success-soft/20">
        <CardContent className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
            <CircleCheck className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold">
              {t("proposalSent")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("proposalFormTitle")}</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="projectId" value={projectId} />

          {state.status === "error" && state.message && (
            <Alert variant="danger">{state.message}</Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="amount"
              label={t("proposalAmount")}
              hint={t("proposalAmountHint", { range: budgetRange })}
              errors={fieldErrors?.amount}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="text"
                  inputMode="numeric"
                  placeholder="2 500 000"
                />
              )}
            </Field>

            <Field
              name="deliveryDays"
              label={t("proposalDays")}
              errors={fieldErrors?.deliveryDays}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  placeholder="14"
                />
              )}
            </Field>
          </div>

          <Field
            name="coverLetter"
            label={t("proposalLetter")}
            errors={fieldErrors?.coverLetter}
            required
          >
            {(field) => (
              <Textarea
                {...field}
                rows={6}
                placeholder={t("proposalLetterPlaceholder")}
                maxLength={3000}
              />
            )}
          </Field>

          <Button type="submit" variant="brand" block loading={isPending}>
            <Send className="size-4" strokeWidth={2} aria-hidden />
            {isPending ? t("proposalSubmitting") : t("proposalSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
