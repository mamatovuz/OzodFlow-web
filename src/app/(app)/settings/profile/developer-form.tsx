"use client";

import { useActionState } from "react";

import { updateDeveloperAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LANGUAGE_CODES } from "@/lib/validators/account";
import { IDLE, type FormState } from "@/lib/validators/form";

/** Ish holati variantlari — `Availability` enum'iga mos tartibda. */
const AVAILABILITY = ["AVAILABLE", "BUSY", "AWAY"] as const;

export type DeveloperFormLabels = {
  headline: string;
  headlineHint: string;
  headlinePlaceholder: string;
  bio: string;
  bioHint: string;
  location: string;
  locationPlaceholder: string;
  experience: string;
  hourlyRate: string;
  hourlyRateHint: string;
  linksTitle: string;
  github: string;
  linkedin: string;
  website: string;
  telegram: string;
  languagesTitle: string;
  languages: Record<(typeof LANGUAGE_CODES)[number], string>;
  availability: string;
  availabilityHint: string;
  availabilityOptions: Record<(typeof AVAILABILITY)[number], string>;
  acceptingWork: string;
  acceptingWorkHint: string;
  save: string;
};

export function DeveloperForm(props: {
  headline: string;
  bio: string;
  location: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  telegramUsername: string;
  yearsExperience: number;
  hourlyRateSum: number;
  availability: string;
  acceptingWork: boolean;
  languages: string[];
  labels: DeveloperFormLabels;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateDeveloperAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const selected = new Set(props.languages);
  const { labels } = props;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field
        name="headline"
        label={labels.headline}
        hint={labels.headlineHint}
        errors={errors?.headline}
      >
        {(field) => (
          <Input
            {...field}
            defaultValue={props.headline}
            maxLength={120}
            placeholder={labels.headlinePlaceholder}
          />
        )}
      </Field>

      <Field
        name="bio"
        label={labels.bio}
        hint={labels.bioHint}
        errors={errors?.bio}
      >
        {(field) => (
          <Textarea {...field} defaultValue={props.bio} rows={6} maxLength={2000} />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="location" label={labels.location} errors={errors?.location}>
          {(field) => (
            <Input
              {...field}
              defaultValue={props.location}
              placeholder={labels.locationPlaceholder}
              maxLength={80}
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
              defaultValue={props.yearsExperience}
            />
          )}
        </Field>
      </div>

      <Field
        name="hourlyRate"
        label={labels.hourlyRate}
        hint={labels.hourlyRateHint}
        errors={errors?.hourlyRate}
      >
        {(field) => (
          <Input
            {...field}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            defaultValue={props.hourlyRateSum}
          />
        )}
      </Field>

      {/* ── Havolalar ─────────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-[15px] font-semibold">
          {labels.linksTitle}
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="githubUrl" label={labels.github} errors={errors?.githubUrl}>
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={props.githubUrl}
                placeholder="https://github.com/ism"
                spellCheck={false}
              />
            )}
          </Field>

          <Field
            name="linkedinUrl"
            label={labels.linkedin}
            errors={errors?.linkedinUrl}
          >
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={props.linkedinUrl}
                placeholder="https://linkedin.com/in/ism"
                spellCheck={false}
              />
            )}
          </Field>

          <Field
            name="portfolioUrl"
            label={labels.website}
            errors={errors?.portfolioUrl}
          >
            {(field) => (
              <Input
                {...field}
                type="url"
                inputMode="url"
                defaultValue={props.portfolioUrl}
                placeholder="https://sayt.uz"
                spellCheck={false}
              />
            )}
          </Field>

          <Field
            name="telegramUsername"
            label={labels.telegram}
            errors={errors?.telegramUsername}
          >
            {(field) => (
              <Input
                {...field}
                defaultValue={props.telegramUsername}
                placeholder="username"
                spellCheck={false}
              />
            )}
          </Field>
        </div>
      </fieldset>

      {/* ── Tillar ────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="mb-3 font-display text-[15px] font-semibold">
          {labels.languagesTitle}
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          {LANGUAGE_CODES.map((code) => (
            <CheckboxField
              key={code}
              // Bir xil `name` — server tomonda massivga yig'iladi
              // (`parseFormData` shuni qiladi). `value` shart: aks holda
              // hammasi "on" yuborardi.
              name="languages"
              value={code}
              label={labels.languages[code]}
              defaultChecked={selected.has(code)}
            />
          ))}
        </div>

        {errors?.languages && (
          <p className="mt-2 text-[13px] text-destructive">
            {errors.languages[0]}
          </p>
        )}
      </fieldset>

      {/* ── Ish holati ────────────────────────────────────────────────── */}
      <Field
        name="availability"
        label={labels.availability}
        hint={labels.availabilityHint}
        errors={errors?.availability}
      >
        {(field) => (
          <Select {...field} defaultValue={props.availability}>
            {AVAILABILITY.map((value) => (
              <option key={value} value={value}>
                {labels.availabilityOptions[value]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <CheckboxField
        name="acceptingWork"
        label={labels.acceptingWork}
        description={labels.acceptingWorkHint}
        defaultChecked={props.acceptingWork}
      />

      <div>
        <Button type="submit" loading={isPending}>
          {labels.save}
        </Button>
      </div>
    </form>
  );
}
