"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { recheckDepositsAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * "Holatni tekshirish" tugmasi.
 *
 * NEGA KERAK: CHECKOUT.UZ webhook'ni QAYTA YUBORMAYDI. Agar webhook
 * yetib kelmasa (tarmoq, deploy paytidagi to'xtash), mijoz to'lagan
 * puli hamyonda ko'rinmaydi va u nima qilishni bilmaydi.
 *
 * Bu tugma shlyuzdan holatni qayta so'raydi — mijoz o'zi hal qila
 * oladigan yo'l, yordam xizmatiga yozish shart emas.
 */
export function RecheckButton() {
  const t = useTranslations("wallet");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    recheckDepositsAction,
    IDLE
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold">
            {t("recheckTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
            {t("recheckBody")}
          </p>
        </div>

        {state.status === "success" && state.message && (
          <Alert variant="success">{state.message}</Alert>
        )}

        {state.status === "error" && state.message && (
          <Alert variant="danger">{state.message}</Alert>
        )}

        <form action={formAction}>
          <Button type="submit" variant="secondary" size="sm" loading={isPending}>
            <RefreshCw className="size-4" strokeWidth={2} aria-hidden />
            {isPending ? t("recheckChecking") : t("recheckCta")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
