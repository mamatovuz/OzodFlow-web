"use client";

import { useActionState } from "react";

import { updateDeveloperAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { IDLE, type FormState } from "@/lib/validators/form";

/** Ish holati variantlari — `Availability` enum'iga mos. */
const AVAILABILITY = [
  { value: "AVAILABLE", label: "Ish qabul qilaman" },
  { value: "BUSY", label: "Band — hozir yangi ish olmayapman" },
  { value: "AWAY", label: "Ta'tilda" },
] as const;

/** Tillar — `LANGUAGE_CODES` bilan bir xil tartibda. */
const LANGUAGES = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Rus" },
  { code: "en", label: "Ingliz" },
  { code: "tr", label: "Turk" },
  { code: "ar", label: "Arab" },
] as const;

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
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateDeveloperAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const selected = new Set(props.languages);

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
        label="Qisqa tavsif"
        hint="Profil sarlavhasida ko'rinadi. Masalan: “Next.js va Telegram bot ishlab chiquvchi”"
        errors={errors?.headline}
      >
        {(field) => (
          <Input
            {...field}
            defaultValue={props.headline}
            maxLength={120}
            placeholder="Nima ish qilasiz?"
          />
        )}
      </Field>

      <Field
        name="bio"
        label="O'zingiz haqingizda"
        hint="Qanday loyihalarda ishlaganingiz, qanday muammolarni hal qilganingiz."
        errors={errors?.bio}
      >
        {(field) => (
          <Textarea {...field} defaultValue={props.bio} rows={6} maxLength={2000} />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="location" label="Joylashuv" errors={errors?.location}>
          {(field) => (
            <Input
              {...field}
              defaultValue={props.location}
              placeholder="Toshkent"
              maxLength={80}
            />
          )}
        </Field>

        <Field
          name="yearsExperience"
          label="Tajriba (yil)"
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
        label="Soatlik narx (so'm)"
        hint="0 qoldirsangiz ko'rsatilmaydi. Bu taxminiy narx — har loyiha uchun alohida kelishiladi."
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
          Havolalar
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="githubUrl" label="GitHub" errors={errors?.githubUrl}>
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

          <Field name="linkedinUrl" label="LinkedIn" errors={errors?.linkedinUrl}>
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
            label="Shaxsiy sayt"
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
            label="Telegram"
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
          Bilgan tillaringiz
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          {LANGUAGES.map((language) => (
            <CheckboxField
              key={language.code}
              // Bir xil `name` — server tomonda massivga yig'iladi
              // (`parseFormData` shuni qiladi).
              name="languages"
              label={language.label}
              defaultChecked={selected.has(language.code)}
              // `value` atributi kerak: aks holda checkbox "on" yuboradi.
              value={language.code}
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
        label="Ish holati"
        hint="“Band” yoki “Ta'tilda” bo'lsangiz profilingiz ko'rinadi, lekin yangi taklif so'ralmaydi."
        errors={errors?.availability}
      >
        {(field) => (
          <Select {...field} defaultValue={props.availability}>
            {AVAILABILITY.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <CheckboxField
        name="acceptingWork"
        label="Yangi loyiha takliflarini qabul qilaman"
        description="O'chirilsa mijozlar sizga taklif yubora olmaydi."
        defaultChecked={props.acceptingWork}
      />

      <div>
        <Button type="submit" loading={isPending}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
