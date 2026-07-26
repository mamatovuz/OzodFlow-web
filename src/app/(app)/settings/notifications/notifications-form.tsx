"use client";

import { useActionState } from "react";

import { updateNotificationsAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

export type NotificationsFormLabels = {
  channelsLegend: string;
  email: string;
  emailHint: string;
  telegram: string;
  telegramHint: string;
  push: string;
  pushHint: string;
  sms: string;
  smsHint: string;
  quietTitle: string;
  quietHint: string;
  quietStart: string;
  quietEnd: string;
  save: string;
};

export function NotificationsForm({
  email,
  telegram,
  push,
  sms,
  quietHoursStart,
  quietHoursEnd,
  labels,
}: {
  email: boolean;
  telegram: boolean;
  push: boolean;
  sms: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  labels: NotificationsFormLabels;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateNotificationsAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">{labels.channelsLegend}</legend>

        <CheckboxField
          name="email"
          label={labels.email}
          description={labels.emailHint}
          defaultChecked={email}
        />

        <CheckboxField
          name="telegram"
          label={labels.telegram}
          description={labels.telegramHint}
          defaultChecked={telegram}
        />

        <CheckboxField
          name="push"
          label={labels.push}
          description={labels.pushHint}
          defaultChecked={push}
        />

        <CheckboxField
          name="sms"
          label={labels.sms}
          description={labels.smsHint}
          defaultChecked={sms}
        />
      </fieldset>

      {/* ── Bezovta qilmaslik ─────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-[15px] font-semibold">
          {labels.quietTitle}
        </legend>

        <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
          {labels.quietHint}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="quietHoursStart"
            label={labels.quietStart}
            errors={errors?.quietHoursStart}
          >
            {(field) => (
              <Input {...field} type="time" defaultValue={quietHoursStart ?? ""} />
            )}
          </Field>

          <Field
            name="quietHoursEnd"
            label={labels.quietEnd}
            errors={errors?.quietHoursEnd}
          >
            {(field) => (
              <Input {...field} type="time" defaultValue={quietHoursEnd ?? ""} />
            )}
          </Field>
        </div>
      </fieldset>

      <div>
        <Button type="submit" loading={isPending}>
          {labels.save}
        </Button>
      </div>
    </form>
  );
}
