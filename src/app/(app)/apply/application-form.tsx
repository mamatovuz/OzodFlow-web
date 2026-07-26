"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";

import {
  saveApplicationAction,
  submitApplicationAction,
} from "@/app/(app)/apply/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

export type ApplicationLabels = {
  fullName: string;
  phone: string;
  phonePlaceholder: string;
  email: string;
  telegram: string;
  telegramHint: string;
  github: string;
  linkedin: string;
  portfolio: string;
  experience: string;
  skills: string;
  skillsHint: string;
  motivation: string;
  motivationHint: string;
  save: string;
  submit: string;
  submitHint: string;
};

export type ApplicationDefaults = {
  fullName: string;
  phone: string;
  email: string;
  telegram: string;
  github: string;
  linkedin: string;
  portfolio: string;
  yearsExperience: number;
  motivation: string;
  skills: string;
};

/**
 * Ariza formasi.
 *
 * IKKI TUGMA: "Saqlash" va "Ko'rikka yuborish".
 *
 * Nega ajratilgan: ariza uzun va odam uni bir o'tirishda to'ldirmaydi.
 * Saqlash `DRAFT` holatida qoldiradi — keyinroq davom etish mumkin.
 * Yuborish esa qaytarib bo'lmaydigan qadam va u alohida bosilishi kerak.
 *
 * "Yuborish" tugmasi ariza BIR MARTA saqlangandan keyin paydo bo'ladi:
 * saqlanmagan formani yuborish bo'sh arizani ko'rikka jo'natardi.
 */
export function ApplicationForm({
  defaults,
  canSubmit,
  labels,
}: {
  defaults: ApplicationDefaults;
  canSubmit: boolean;
  labels: ApplicationLabels;
}) {
  const [saveState, saveAction, isSaving] = useActionState<FormState, FormData>(
    saveApplicationAction,
    IDLE
  );

  const [submitState, submitAction, isSubmitting] = useActionState<
    FormState,
    FormData
  >(submitApplicationAction, IDLE);

  const errors = saveState.status === "error" ? saveState.fieldErrors : undefined;

  // Saqlangandan keyin yuborish tugmasi ochiladi.
  const showSubmit = canSubmit || saveState.status === "success";

  return (
    <div className="flex flex-col gap-6">
      <form action={saveAction} className="flex flex-col gap-5">
        {saveState.status === "success" && saveState.message && (
          <Alert variant="success">{saveState.message}</Alert>
        )}

        {saveState.status === "error" && saveState.message && (
          <Alert variant="danger">{saveState.message}</Alert>
        )}

        <Field
          name="fullName"
          label={labels.fullName}
          errors={errors?.fullName}
          required
        >
          {(field) => (
            <Input
              {...field}
              defaultValue={defaults.fullName}
              autoComplete="name"
              maxLength={80}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="phone"
            label={labels.phone}
            errors={errors?.phone}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="tel"
                inputMode="tel"
                defaultValue={defaults.phone}
                placeholder={labels.phonePlaceholder}
                autoComplete="tel"
              />
            )}
          </Field>

          <Field
            name="email"
            label={labels.email}
            errors={errors?.email}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="email"
                inputMode="email"
                defaultValue={defaults.email}
                autoComplete="email"
                spellCheck={false}
              />
            )}
          </Field>
        </div>

        <Field
          name="telegram"
          label={labels.telegram}
          hint={labels.telegramHint}
          errors={errors?.telegram}
        >
          {(field) => (
            <Input
              {...field}
              defaultValue={defaults.telegram}
              placeholder="username"
              spellCheck={false}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="github" label={labels.github} errors={errors?.github}>
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={defaults.github}
                placeholder="https://github.com/ism"
                spellCheck={false}
              />
            )}
          </Field>

          <Field
            name="linkedin"
            label={labels.linkedin}
            errors={errors?.linkedin}
          >
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={defaults.linkedin}
                placeholder="https://linkedin.com/in/ism"
                spellCheck={false}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Field
            name="portfolio"
            label={labels.portfolio}
            errors={errors?.portfolio}
          >
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={defaults.portfolio}
                placeholder="https://sayt.uz"
                spellCheck={false}
              />
            )}
          </Field>

          <Field
            name="yearsExperience"
            label={labels.experience}
            errors={errors?.yearsExperience}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                defaultValue={defaults.yearsExperience}
              />
            )}
          </Field>
        </div>

        <Field
          name="skills"
          label={labels.skills}
          hint={labels.skillsHint}
          errors={errors?.skills}
          required
        >
          {(field) => (
            <Input
              {...field}
              defaultValue={defaults.skills}
              placeholder="Next.js, PostgreSQL, Telegram Bot API"
            />
          )}
        </Field>

        <Field
          name="motivation"
          label={labels.motivation}
          hint={labels.motivationHint}
          errors={errors?.motivation}
        >
          {(field) => (
            <Textarea
              {...field}
              defaultValue={defaults.motivation}
              rows={6}
              maxLength={1500}
            />
          )}
        </Field>

        <div>
          <Button type="submit" variant="secondary" loading={isSaving}>
            {labels.save}
          </Button>
        </div>
      </form>

      {/* ── Yuborish — ALOHIDA forma ──────────────────────────────────── */}
      {showSubmit && (
        <form
          action={submitAction}
          className="flex flex-col gap-3 border-t border-border-subtle pt-6"
        >
          {submitState.status === "error" && submitState.message && (
            <Alert variant="danger">{submitState.message}</Alert>
          )}

          <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
            {labels.submitHint}
          </p>

          <div>
            <Button type="submit" loading={isSubmitting}>
              <Send className="size-4" strokeWidth={2} aria-hidden />
              {labels.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
