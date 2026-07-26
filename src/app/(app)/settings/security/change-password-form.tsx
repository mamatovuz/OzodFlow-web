"use client";

import { useActionState } from "react";

import { changePasswordAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  NewPasswordInput,
  PasswordInput,
} from "@/components/ui/password-input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Parolni o'zgartirish.
 *
 * Muvaffaqiyatdan keyin maydonlar TOZALANADI (`key` orqali qayta
 * yasaladi): brauzer parolni saqlab qolgan bo'lsa uni ekranda qoldirish
 * xavfsiz emas va foydalanuvchi "saqlanmadimi?" deb qayta bosadi.
 */
export type PasswordFormLabels = {
  currentPassword: string;
  newPassword: string;
  newPasswordHint: string;
  confirmPassword: string;
  warning: string;
  submit: string;
};

export function ChangePasswordForm({
  labels,
}: {
  labels: PasswordFormLabels;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    changePasswordAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const isSuccess = state.status === "success";

  return (
    <form
      action={formAction}
      // Muvaffaqiyatda forma qayta yasaladi va maydonlar bo'shaydi.
      key={isSuccess ? "done" : "editing"}
      className="flex flex-col gap-5"
    >
      {isSuccess && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field
        name="currentPassword"
        label={labels.currentPassword}
        errors={errors?.currentPassword}
        required
      >
        {(props) => (
          <PasswordInput {...props} autoComplete="current-password" />
        )}
      </Field>

      <Field
        name="password"
        label={labels.newPassword}
        hint={labels.newPasswordHint}
        errors={errors?.password}
        required
      >
        {(props) => <NewPasswordInput {...props} autoComplete="new-password" />}
      </Field>

      <Field
        name="passwordConfirm"
        label={labels.confirmPassword}
        errors={errors?.passwordConfirm}
        required
      >
        {(props) => <PasswordInput {...props} autoComplete="new-password" />}
      </Field>

      <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
        {labels.warning}
      </p>

      <div>
        <Button type="submit" loading={isPending}>
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
