"use client";

import { Building2, Check, Copy, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { requestDepositAction, type DepositResult } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IDLE, type FormState } from "@/lib/validators/form";

type Method = "GATEWAY" | "BANK";

export function DepositForm({
  gatewayEnabled,
  gatewayLimitLabel,
}: {
  gatewayEnabled: boolean;
  /** Serverda formatlangan limit matni */
  gatewayLimitLabel: string;
}) {
  const t = useTranslations("wallet");

  const [state, formAction, isPending] = useActionState<
    FormState<DepositResult>,
    FormData
  >(requestDepositAction, IDLE);

  // Shlyuz sozlanmagan bo'lsa faqat bank yo'li qoladi.
  const [method, setMethod] = useState<Method>(
    gatewayEnabled ? "GATEWAY" : "BANK"
  );

  /**
   * Bank yo'lida muvaffaqiyatdan keyin forma O'RNIGA ko'rsatma chiqadi.
   *
   * Shlyuz yo'lida bu holatga kelinmaydi: action foydalanuvchini to'lov
   * sahifasiga yo'naltiradi.
   */
  if (state.status === "success" && state.data) {
    return <DepositInstructions result={state.data} note={t("manualNote")} />;
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topUpTitle")}</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {state.status === "error" && state.message && (
            <Alert variant="danger">{state.message}</Alert>
          )}

          {!gatewayEnabled && (
            <Alert variant="warning">{t("gatewayDisabled")}</Alert>
          )}

          <Field
            name="amount"
            label={t("amountLabel")}
            hint={method === "GATEWAY" ? gatewayLimitLabel : undefined}
            errors={fieldErrors?.amount}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="text"
                inputMode="numeric"
                placeholder={t("amountPlaceholder")}
              />
            )}
          </Field>

          {/* ── To'lov usuli ─────────────────────────────────────────────
              Radio kartochkalar: ichida HAQIQIY `<input type="radio">`
              bor (`sr-only`), shuning uchun klaviatura va ekran o'quvchi
              bilan to'liq ishlaydi. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">
              {t("methodLabel")}
            </legend>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {gatewayEnabled && (
                <MethodOption
                  value="GATEWAY"
                  checked={method === "GATEWAY"}
                  onSelect={setMethod}
                  icon={CreditCard}
                  title={t("methodGateway")}
                  hint={t("methodGatewayHint")}
                />
              )}

              <MethodOption
                value="BANK"
                checked={method === "BANK"}
                onSelect={setMethod}
                icon={Building2}
                title={t("methodBank")}
                hint={t("methodBankHint")}
              />
            </div>
          </fieldset>

          <Button type="submit" variant="brand" block loading={isPending}>
            {isPending
              ? t("topUpSubmitting")
              : method === "GATEWAY"
                ? t("topUpSubmit")
                : t("topUpSubmitBank")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MethodOption({
  value,
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
}: {
  value: Method;
  checked: boolean;
  onSelect: (method: Method) => void;
  icon: typeof CreditCard;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3.5",
        "transition-[border-color,background-color] duration-150",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
        checked
          ? "border-brand bg-brand-soft/50"
          : "border-border bg-card hover:border-input hover:bg-surface-1"
      )}
    >
      <input
        type="radio"
        name="method"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />

      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg transition-colors",
          checked ? "bg-brand text-brand-foreground" : "bg-surface-2 text-muted-foreground"
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>

      <span className="text-[13px] font-medium leading-snug">{title}</span>
      <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
    </label>
  );
}

/**
 * Bank o'tkazmasi ko'rsatmasi.
 *
 * Kod ajratib ko'rsatiladi va nusxalash tugmasi bor: uni qo'lda
 * ko'chirish xatoga olib keladi, xato kod esa adminning o'tkazmani
 * topa olmasligi demakdir.
 */
function DepositInstructions({
  result,
  note,
}: {
  result: DepositResult;
  note: string;
}) {
  const t = useTranslations("wallet");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API yopiq bo'lsa (HTTP yoki ruxsat berilmagan) —
      // foydalanuvchi kodni qo'lda ko'chiradi, u ekranda ko'rinib turibdi.
    }
  }

  return (
    <Card className="border-brand/30 bg-brand-soft/20">
      <CardHeader className="border-b-0">
        <CardTitle>{t("instructionsTitle")}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {t("instructionsBody")}
        </p>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("codeLabel")}
          </p>

          <div className="mt-1.5 flex items-center gap-3">
            <code className="amount flex-1 text-lg font-semibold tracking-wider">
              {result.code}
            </code>

            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={copyCode}
              aria-label="Kodni nusxalash"
            >
              {copied ? (
                <Check className="size-4 text-success" strokeWidth={2.5} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={2} aria-hidden />
              )}
            </Button>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("amountToPay")}
            </p>
            <p className="amount mt-1 text-lg font-semibold [font-variant-numeric:proportional-nums]">
              {result.amount}
            </p>
          </div>
        </div>

        <Alert variant="warning">{note}</Alert>
      </CardContent>
    </Card>
  );
}
