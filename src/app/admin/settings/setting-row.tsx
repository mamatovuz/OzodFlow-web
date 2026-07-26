"use client";

import { useActionState } from "react";

import { updateSettingAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

export type SettingRowLabels = {
  save: string;
  protectedLabel: string;
  updatedAt: string;
  warning: string | null;
};

/**
 * Bitta sozlama qatori.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TUR QIYMATDAN ANIQLANADI
 *
 *  Sozlamalar JSON matn sifatida saqlanadi (`"1500"`, `"true"`). Har
 *  kalit uchun UI turini qo'lda yozish o'rniga qiymatning o'zidan
 *  aniqlanadi: `true`/`false` → checkbox, son → raqamli maydon.
 *
 *  Bu yangi sozlama qo'shilganda UI ni tegishsiz ishlashini
 *  ta'minlaydi. Server tomonda tur baribir sxema bilan tekshiriladi
 *  (`SETTING_SCHEMAS`), ya'ni bu taxmin xavfsiz.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function SettingRow({
  settingKey,
  label,
  description,
  rawValue,
  isProtected,
  canEdit,
  updatedLabel,
  labels,
}: {
  settingKey: string;
  label: string;
  description: string;
  rawValue: string;
  isProtected: boolean;
  canEdit: boolean;
  updatedLabel: string;
  labels: SettingRowLabels;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateSettingAction,
    IDLE
  );

  const parsed = parseValue(rawValue);
  const isBoolean = typeof parsed === "boolean";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {label}

            {isProtected && (
              <Badge variant="warning" size="sm">
                {labels.protectedLabel}
              </Badge>
            )}
          </p>

          {description && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {settingKey}
            {" · "}
            {labels.updatedAt}: {updatedLabel}
          </p>
        </div>
      </div>

      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      {labels.warning && <Alert variant="warning">{labels.warning}</Alert>}

      {canEdit ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="key" value={settingKey} />

          {isBoolean ? (
            <>
              {/* Server checkbox turini shu bayroq orqali biladi:
                  belgilanmagan checkbox FormData'ga umuman tushmaydi. */}
              <input type="hidden" name="isBoolean" value="1" />

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="value"
                  defaultChecked={parsed}
                  className="size-[18px] cursor-pointer rounded-[5px] border border-input bg-card accent-brand focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none"
                />
                {parsed ? "Yoqilgan" : "O'chirilgan"}
              </label>
            </>
          ) : (
            <Input
              name="value"
              type="number"
              inputMode="numeric"
              defaultValue={String(parsed)}
              className="w-40"
              aria-label={label}
            />
          )}

          <Button type="submit" variant="secondary" size="sm" loading={isPending}>
            {labels.save}
          </Button>
        </form>
      ) : (
        // Faqat ko'rish: qiymat monoshiriftda ko'rsatiladi.
        <p className="amount font-mono text-sm">{String(parsed)}</p>
      )}
    </div>
  );
}

/**
 * JSON matnni qiymatga aylantiradi.
 *
 * Buzuq bo'lsa xom matn qaytadi — sahifa yiqilmasligi kerak va admin
 * qiymat buzilganini KO'RISHI kerak.
 */
function parseValue(raw: string): boolean | number | string {
  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value;

    return String(value);
  } catch {
    return raw;
  }
}
