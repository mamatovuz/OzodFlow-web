"use client";

import { ArrowRight, BriefcaseBusiness, Code2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { registerAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NewPasswordInput, PasswordInput } from "@/components/ui/password-input";
import { UserRole } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { IDLE, type FormState } from "@/lib/validators/form";

export function RegisterForm({
  next,
  referralCode,
  defaultRole = UserRole.CUSTOMER,
}: {
  next?: string;
  referralCode?: string;
  defaultRole?: UserRole;
}) {
  const t = useTranslations("auth.register");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    registerAction,
    IDLE
  );

  // Rol tanlovi klientda kuzatiladi — developer tanlanganda qo'shimcha
  // izoh ko'rsatiladi, shunda ariza jarayoni kutilmagan bo'lib chiqmaydi.
  const [role, setRole] = useState<UserRole>(defaultRole);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {referralCode && (
        <input type="hidden" name="referralCode" value={referralCode} />
      )}

      {/*
        HONEYPOT — botlarga qarshi.

        `sr-only` emas, `hidden` ham emas: ekran o'quvchi uni o'qimasligi
        kerak (`aria-hidden`), lekin bot uchun DOM'da ko'rinishi kerak.
        `tabIndex={-1}` — klaviatura bilan yurganda unga tushib qolmaydi.
      */}
      <div
        className="pointer-events-none absolute left-[-9999px] size-0 overflow-hidden opacity-0"
        aria-hidden
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      {/* ── Rol tanlovi ──────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">
          {t("roleLabel")}
        </legend>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <RoleOption
            value={UserRole.CUSTOMER}
            checked={role === UserRole.CUSTOMER}
            onSelect={setRole}
            icon={BriefcaseBusiness}
            title={t("roleCustomer")}
            hint={t("roleCustomerHint")}
          />
          <RoleOption
            value={UserRole.DEVELOPER}
            checked={role === UserRole.DEVELOPER}
            onSelect={setRole}
            icon={Code2}
            title={t("roleDeveloper")}
            hint={t("roleDeveloperHint")}
          />
        </div>

        {fieldErrors?.role && (
          <p role="alert" className="text-[13px] text-destructive">
            {fieldErrors.role[0]}
          </p>
        )}
      </fieldset>

      {role === UserRole.DEVELOPER && (
        <Alert variant="info">{t("developerNote")}</Alert>
      )}

      {/* ── Ma'lumotlar ──────────────────────────────────────────────── */}
      <Field name="name" label={t("name")} errors={fieldErrors?.name} required>
        {(field) => (
          <Input
            {...field}
            placeholder={t("namePlaceholder")}
            autoComplete="name"
            autoFocus
          />
        )}
      </Field>

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
          />
        )}
      </Field>

      <Field
        name="password"
        label={t("password")}
        errors={fieldErrors?.password}
        required
      >
        {(field) => <NewPasswordInput {...field} autoComplete="new-password" />}
      </Field>

      <Field
        name="passwordConfirm"
        label={t("passwordConfirm")}
        errors={fieldErrors?.passwordConfirm}
        required
      >
        {(field) => <PasswordInput {...field} autoComplete="new-password" />}
      </Field>

      <CheckboxField
        name="acceptTerms"
        invalid={Boolean(fieldErrors?.acceptTerms)}
        label={
          <>
            <Link
              href="/terms"
              target="_blank"
              className="font-medium text-brand hover:underline"
            >
              Foydalanish shartlari
            </Link>{" "}
            va{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-medium text-brand hover:underline"
            >
              maxfiylik siyosati
            </Link>
            ga qo&apos;shilaman
          </>
        }
      />

      {fieldErrors?.acceptTerms && (
        <p role="alert" className="-mt-3 text-[13px] text-destructive">
          {fieldErrors.acceptTerms[0]}
        </p>
      )}

      <Button type="submit" variant="brand" size="lg" block loading={isPending}>
        {isPending ? t("submitting") : t("submit")}
        {!isPending && <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />}
      </Button>
    </form>
  );
}

/**
 * Rol tanlovi kartochkasi.
 *
 * Ichida HAQIQIY `<input type="radio">` bor — u `sr-only` bilan
 * yashirilgan, lekin klaviatura va ekran o'quvchi uchun to'liq ishlaydi.
 * `<div onClick>` bilan yasalgan "radio" esa Tab bilan yuradigan
 * foydalanuvchi uchun umuman ishlamaydi.
 */
function RoleOption({
  value,
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
}: {
  value: UserRole;
  checked: boolean;
  onSelect: (role: UserRole) => void;
  icon: typeof Code2;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4",
        "transition-[border-color,background-color,box-shadow] duration-150",
        // `has-[:focus-visible]` — ichkaridagi radio fokusda bo'lsa
        // kartochka halqa oladi. Klaviatura bilan qaysi variant
        // tanlanayotgani ko'rinib turadi.
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
        checked
          ? "border-brand bg-brand-soft/50 shadow-xs"
          : "border-border bg-card hover:border-input hover:bg-surface-1"
      )}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />

      <span
        className={cn(
          "grid size-9 place-items-center rounded-lg transition-colors",
          checked
            ? "bg-brand text-brand-foreground"
            : "bg-surface-2 text-muted-foreground"
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>

      <span className="text-sm font-medium leading-snug">{title}</span>
      <span className="text-[13px] leading-snug text-muted-foreground">{hint}</span>
    </label>
  );
}
