"use client";

import { BadgeCheck, BadgeAlert } from "lucide-react";
import { useActionState } from "react";

import { changeEmailAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Emailni o'zgartirish.
 *
 * PAROL SO'RALADI: email — parolni tiklash kanali. Uni parolsiz
 * o'zgartirish mumkin bo'lsa, hisobga bir marta kirgan odam emailni
 * o'ziga almashtirib, keyin parolni tiklab hisobni butunlay egallab
 * olardi.
 */
export type EmailFormLabels = {
  verified: string;
  notVerified: string;
  needsPassword: string;
  newEmail: string;
  emailPlaceholder: string;
  password: string;
  passwordHint: string;
  submit: string;
};

export function ChangeEmailForm({
  email,
  emailVerified,
  canChange,
  labels,
}: {
  email: string | null;
  emailVerified: boolean;
  /** Parolsiz hisobda o'zgartirish mumkin emas */
  canChange: boolean;
  labels: EmailFormLabels;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    changeEmailAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const isSuccess = state.status === "success";

  return (
    <div className="flex flex-col gap-5">
      {/* Hozirgi holat */}
      {email && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{email}</span>

          {emailVerified ? (
            <Badge variant="success" size="sm">
              <BadgeCheck className="size-3.5" strokeWidth={2.5} aria-hidden />
              {labels.verified}
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              <BadgeAlert className="size-3.5" strokeWidth={2.5} aria-hidden />
              {labels.notVerified}
            </Badge>
          )}
        </div>
      )}

      {!canChange ? (
        <p className="text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {labels.needsPassword}
        </p>
      ) : (
        <form
          action={formAction}
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
            name="email"
            label={labels.newEmail}
            errors={errors?.email}
            required
          >
            {(props) => (
              <Input
                {...props}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder={labels.emailPlaceholder}
              />
            )}
          </Field>

          <Field
            name="currentPassword"
            label={labels.password}
            hint={labels.passwordHint}
            errors={errors?.currentPassword}
            required
          >
            {(props) => (
              <PasswordInput {...props} autoComplete="current-password" />
            )}
          </Field>

          <div>
            <Button type="submit" variant="secondary" loading={isPending}>
              {labels.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
