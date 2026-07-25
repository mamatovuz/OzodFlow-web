"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { IDLE, type FormState } from "@/lib/validators/form";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth.login");

  /**
   * `useActionState` — React 19. Forma yuborilganda action serverda
   * bajariladi, natija `state` ga tushadi.
   *
   * Nega `useState` + `fetch` emas: bu yo'l JavaScript yuklanmagan
   * holatda ham ishlaydi (progressive enhancement). Sekin internetda
   * sahifa hali "gidratlanmagan" bo'lsa ham forma yuboriladi.
   */
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    loginAction,
    IDLE
  );

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {/* Kirgandan keyin qaytadigan manzil. Server tomonda tekshiriladi
          (`safeRedirectPath`) — bu yerdagi qiymatga ishonilmaydi. */}
      {next && <input type="hidden" name="next" value={next} />}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field
        name="identifier"
        label={t("identifier")}
        errors={fieldErrors?.identifier}
        required
      >
        {(field) => (
          <Input
            {...field}
            type="text"
            placeholder={t("identifierPlaceholder")}
            // Brauzer parol menejeri to'g'ri ishlashi uchun
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <Field
          name="password"
          label={t("password")}
          errors={fieldErrors?.password}
          required
        >
          {(field) => (
            <PasswordInput {...field} autoComplete="current-password" />
          )}
        </Field>

        <Link
          href="/forgot-password"
          className="self-end text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
        >
          {t("forgot")}
        </Link>
      </div>

      <CheckboxField name="remember" label={t("remember")} defaultChecked />

      <Button type="submit" variant="brand" size="lg" block loading={isPending}>
        {isPending ? t("submitting") : t("submit")}
        {!isPending && <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />}
      </Button>
    </form>
  );
}
