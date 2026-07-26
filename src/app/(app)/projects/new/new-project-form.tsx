"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { createProjectAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { IDLE, type FormState } from "@/lib/validators/form";

export type CategoryOption = {
  id: string;
  name: string;
  children: Array<{ id: string; name: string }>;
};

export function NewProjectForm({
  categories,
  moderationEnabled,
}: {
  categories: CategoryOption[];
  moderationEnabled: boolean;
}) {
  const t = useTranslations("projects.new");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createProjectAction,
    IDLE
  );

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  // Bugungi sana — `min` atributi uchun. O'tgan sanani tanlashning
  // oldini brauzer darajasida oladi (server ham tekshiradi).
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field
        name="title"
        label={t("titleLabel")}
        hint={t("titleHint")}
        errors={fieldErrors?.title}
        required
      >
        {(field) => (
          <Input {...field} placeholder={t("titlePlaceholder")} maxLength={120} autoFocus />
        )}
      </Field>

      <Field
        name="categoryId"
        label={t("categoryLabel")}
        errors={fieldErrors?.categoryId}
        required
      >
        {(field) => (
          <Select {...field} defaultValue="">
            <option value="" disabled>
              {t("categoryPlaceholder")}
            </option>

            {categories.map((category) =>
              // Ichki bo'limlari bor kategoriya `<optgroup>` bo'ladi:
              // foydalanuvchi aniqroq tanlaydi, biz esa aniqroq
              // yo'naltiramiz.
              category.children.length > 0 ? (
                <optgroup key={category.id} label={category.name}>
                  <option value={category.id}>{category.name} — umumiy</option>
                  {category.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              )
            )}
          </Select>
        )}
      </Field>

      <Field
        name="description"
        label={t("descriptionLabel")}
        hint={t("descriptionHint")}
        errors={fieldErrors?.description}
        required
      >
        {(field) => (
          <Textarea
            {...field}
            rows={7}
            placeholder={t("descriptionPlaceholder")}
            maxLength={5000}
          />
        )}
      </Field>

      <Field
        name="requirements"
        label={t("requirementsLabel")}
        hint={t("requirementsHint")}
        errors={fieldErrors?.requirements}
      >
        {(field) => <Textarea {...field} rows={4} maxLength={5000} />}
      </Field>

      {/* ── Byudjet ────────────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          {t("budgetLabel")} <span className="text-destructive">*</span>
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            name="budgetMin"
            label={t("budgetMinLabel")}
            errors={fieldErrors?.budgetMin}
          >
            {(field) => (
              <Input
                {...field}
                // `type="text"` ATAYLAB: `number` probel bilan ajratilgan
                // summani ("1 500 000") qabul qilmaydi va strelkalar bilan
                // tasodifan qiymatni o'zgartirib yuboradi.
                type="text"
                inputMode="numeric"
                placeholder="1 500 000"
              />
            )}
          </Field>

          <Field
            name="budgetMax"
            label={t("budgetMaxLabel")}
            errors={fieldErrors?.budgetMax}
          >
            {(field) => (
              <Input {...field} type="text" inputMode="numeric" placeholder="3 000 000" />
            )}
          </Field>
        </div>

        <p className="text-[13px] text-muted-foreground">{t("budgetHint")}</p>
      </fieldset>

      <Field
        name="deadlineAt"
        label={t("deadlineLabel")}
        hint={t("deadlineHint")}
        errors={fieldErrors?.deadlineAt}
        required
      >
        {(field) => <Input {...field} type="date" min={today} />}
      </Field>

      <CheckboxField
        name="isUrgent"
        label={t("urgentLabel")}
        description={t("urgentHint")}
      />

      {moderationEnabled && <Alert variant="info">{t("moderationNote")}</Alert>}

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Button type="submit" variant="brand" size="lg" block loading={isPending}>
          {isPending ? t("submitting") : t("submit")}
          {!isPending && <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden />}
        </Button>

        <p className="text-center text-[13px] text-muted-foreground">
          {t("freeNote")}
        </p>
      </div>
    </form>
  );
}
