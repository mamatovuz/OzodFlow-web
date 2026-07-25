"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NewPasswordInput, PasswordInput } from "@/components/ui/password-input";
import { IDLE, type FormState } from "@/lib/validators/form";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    IDLE
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
          <CircleCheck className="size-6" strokeWidth={1.75} aria-hidden />
        </span>

        <div>
          <p className="font-display text-base font-semibold">{t("successTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {t("successBody")}
          </p>
        </div>

        <Button asChild variant="brand" block>
          <Link href="/login">{t("loginNow")}</Link>
        </Button>
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* Token yashirin maydonda. Server tomonda qayta tekshiriladi —
          bu qiymatga ishonilmaydi. */}
      <input type="hidden" name="token" value={token} />

      {state.status === "error" && state.message && (
        <Alert variant="danger">
          <div className="flex flex-col gap-3">
            <span>{state.message}</span>
            <Button asChild variant="secondary" size="sm" className="self-start">
              <Link href="/forgot-password">{t("requestNew")}</Link>
            </Button>
          </div>
        </Alert>
      )}

      <Field
        name="password"
        label={t("password")}
        errors={fieldErrors?.password}
        required
      >
        {(field) => (
          <NewPasswordInput {...field} autoComplete="new-password" autoFocus />
        )}
      </Field>

      <Field
        name="passwordConfirm"
        label={t("passwordConfirm")}
        errors={fieldErrors?.passwordConfirm}
        required
      >
        {(field) => <PasswordInput {...field} autoComplete="new-password" />}
      </Field>

      <Button type="submit" variant="brand" size="lg" block loading={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
