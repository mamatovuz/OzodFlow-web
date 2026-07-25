"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

export function ForgotPasswordForm({
  ttlMinutes,
  emailConfigured,
}: {
  ttlMinutes: number;
  /** SMTP sozlanmagan bo'lsa foydalanuvchiga ochiq aytiladi */
  emailConfigured: boolean;
}) {
  const t = useTranslations("auth.forgot");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    forgotPasswordAction,
    IDLE
  );

  /**
   * Muvaffaqiyat holatida forma O'RNIGA xabar ko'rsatiladi.
   *
   * Formani qoldirib, ustiga "yuborildi" yozish foydalanuvchini yana
   * bosishga undaydi — bu keraksiz xatlar va rate limit chegarasiga
   * urilishga olib keladi.
   */
  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
          <MailCheck className="size-6" strokeWidth={1.75} aria-hidden />
        </span>

        <div>
          <p className="font-display text-base font-semibold">{t("sentTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {t("sentBody", { minutes: ttlMinutes })}
          </p>
        </div>

        {!emailConfigured && (
          <Alert variant="warning" className="text-left">
            {t("notConfiguredNote")}
          </Alert>
        )}

        <Button asChild variant="secondary" block>
          <Link href="/login">
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
            {t("backToLogin")}
          </Link>
        </Button>
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* Honeypot */}
      <div
        className="pointer-events-none absolute left-[-9999px] size-0 overflow-hidden opacity-0"
        aria-hidden
      >
        <label htmlFor="forgot-website">Website</label>
        <input id="forgot-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field name="email" label={t("email")} errors={fieldErrors?.email} required>
        {(field) => (
          <Input
            {...field}
            type="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
        )}
      </Field>

      <Button type="submit" variant="brand" size="lg" block loading={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
        {t("backToLogin")}
      </Link>
    </form>
  );
}
