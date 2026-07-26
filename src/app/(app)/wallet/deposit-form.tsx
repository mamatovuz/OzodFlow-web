"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { requestDepositAction, type DepositResult } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { IDLE, type FormState } from "@/lib/validators/form";

export function DepositForm() {
  const t = useTranslations("wallet");

  const [state, formAction, isPending] = useActionState<
    FormState<DepositResult>,
    FormData
  >(requestDepositAction, IDLE);

  // Muvaffaqiyatli so'rovdan keyin forma o'rniga KO'RSATMA chiqadi.
  if (state.status === "success" && state.data) {
    return <DepositInstructions result={state.data} note={t("manualNote")} />;
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topUpTitle")}</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {state.status === "error" && state.message && (
            <Alert variant="danger">{state.message}</Alert>
          )}

          <Field
            name="amount"
            label={t("amountLabel")}
            errors={fieldErrors?.amount}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="text"
                inputMode="numeric"
                placeholder={t("amountPlaceholder")}
              />
            )}
          </Field>

          <Field name="method" label={t("methodLabel")} errors={fieldErrors?.method}>
            {(field) => (
              <Select {...field} defaultValue="CARD">
                <option value="CARD">Karta orqali</option>
                <option value="BANK">Bank o&apos;tkazmasi</option>
              </Select>
            )}
          </Field>

          <Button type="submit" variant="brand" block loading={isPending}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            {isPending ? t("topUpSubmitting") : t("topUpSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * To'lov ko'rsatmasi.
 *
 * Kod ajratib ko'rsatiladi va nusxalash tugmasi bor: uni qo'lda ko'chirish
 * xatoga olib keladi, xato kod esa adminning o'tkazmani topa olmasligi
 * demakdir.
 */
function DepositInstructions({
  result,
  note,
}: {
  result: DepositResult;
  note: string;
}) {
  const t = useTranslations("wallet");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      // Tasdiq belgisi 2 soniyadan keyin o'chadi.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API yopiq bo'lsa (HTTP yoki ruxsat berilmagan) —
      // foydalanuvchi kodni qo'lda ko'chiradi, u ekranda ko'rinib turibdi.
    }
  }

  return (
    <Card className="border-brand/30 bg-brand-soft/20">
      <CardHeader className="border-b-0">
        <CardTitle>{t("instructionsTitle")}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {t("instructionsBody")}
        </p>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("codeLabel")}
          </p>

          <div className="mt-1.5 flex items-center gap-3">
            <code className="amount flex-1 text-lg font-semibold tracking-wider">
              {result.code}
            </code>

            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={copyCode}
              aria-label="Kodni nusxalash"
            >
              {copied ? (
                <Check className="size-4 text-success" strokeWidth={2.5} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={2} aria-hidden />
              )}
            </Button>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("amountToPay")}
            </p>
            <p className="amount mt-1 text-lg font-semibold [font-variant-numeric:proportional-nums]">
              {result.amount}
            </p>
          </div>
        </div>

        <Alert variant="warning">{note}</Alert>
      </CardContent>
    </Card>
  );
}
