"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { confirmDepositAction, rejectDepositAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * To'lovni tasdiqlash / rad etish.
 *
 * Tasdiqlash tugmasi ATAYLAB ogohlantirish bilan birga turadi: bu amal
 * hamyonga HAQIQIY PUL qo'shadi va uni orqaga qaytarish uchun alohida
 * tuzatish tranzaksiyasi kerak bo'ladi. Tasodifan bosilishi mumkin
 * bo'lgan amal emas.
 */
export function PaymentActions({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin.payments");

  const [confirmState, confirmAction, confirmPending] = useActionState<
    FormState,
    FormData
  >(confirmDepositAction, IDLE);

  const [rejectState, rejectAction, rejectPending] = useActionState<
    FormState,
    FormData
  >(rejectDepositAction, IDLE);

  if (confirmState.status === "success") {
    return <Alert variant="success">{confirmState.message}</Alert>;
  }

  if (rejectState.status === "success") {
    return <Alert variant="info">{rejectState.message}</Alert>;
  }

  return (
    <div className="flex flex-col gap-3">
      {confirmState.status === "error" && confirmState.message && (
        <Alert variant="danger">{confirmState.message}</Alert>
      )}
      {rejectState.status === "error" && rejectState.message && (
        <Alert variant="danger">{rejectState.message}</Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <form action={confirmAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button type="submit" variant="success" size="sm" loading={confirmPending}>
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
            {t("confirm")}
          </Button>
        </form>

        {/* Rad etish sabab talab qiladi — shuning uchun `<details>` ichida */}
        <details className="group">
          <summary className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
            <X className="size-4" strokeWidth={2} aria-hidden />
            {t("reject")}
          </summary>

          <form action={rejectAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="paymentId" value={paymentId} />

            <div className="min-w-[16rem] flex-1">
              <label
                htmlFor={`reject-${paymentId}`}
                className="text-[13px] font-medium"
              >
                {t("rejectReason")}
              </label>
              <Input
                id={`reject-${paymentId}`}
                name="reason"
                className="mt-1 h-9"
                placeholder="O'tkazma kelmadi"
                required
              />
            </div>

            <Button type="submit" variant="destructive" size="sm" loading={rejectPending}>
              {t("reject")}
            </Button>
          </form>
        </details>
      </div>
    </div>
  );
}
