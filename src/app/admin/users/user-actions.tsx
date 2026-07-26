"use client";

import { BadgeCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  unverifyDeveloperAction,
  verifyDeveloperAction,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Mutaxassisni tasdiqlash / tasdiqni bekor qilish.
 *
 * Tasdiqlash — bir bosishlik, chunki u qaytariladigan amal.
 * Bekor qilish esa sabab talab qiladi: u mutaxassisning ommaviy
 * profilini yopadi va daromadiga ta'sir qiladi, ya'ni izohsiz
 * qilinmasligi kerak.
 */
export function VerifyActions({
  userId,
  isVerified,
}: {
  userId: string;
  isVerified: boolean;
}) {
  const t = useTranslations("admin.users");

  const [verifyState, verifyAction, verifyPending] = useActionState<
    FormState,
    FormData
  >(verifyDeveloperAction, IDLE);

  const [unverifyState, unverifyAction, unverifyPending] = useActionState<
    FormState,
    FormData
  >(unverifyDeveloperAction, IDLE);

  if (verifyState.status === "success") {
    return <Alert variant="success">{verifyState.message}</Alert>;
  }

  if (unverifyState.status === "success") {
    return <Alert variant="info">{unverifyState.message}</Alert>;
  }

  return (
    <div className="flex flex-col gap-3">
      {verifyState.status === "error" && verifyState.message && (
        <Alert variant="danger">{verifyState.message}</Alert>
      )}
      {unverifyState.status === "error" && unverifyState.message && (
        <Alert variant="danger">{unverifyState.message}</Alert>
      )}

      {isVerified ? (
        <details>
          <summary className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
            <X className="size-4" strokeWidth={2} aria-hidden />
            {t("unverify")}
          </summary>

          <form action={unverifyAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="userId" value={userId} />

            <div className="min-w-[16rem] flex-1">
              <label htmlFor={`unverify-${userId}`} className="text-[13px] font-medium">
                {t("unverifyReason")}
              </label>
              <Input
                id={`unverify-${userId}`}
                name="reason"
                className="mt-1 h-9"
                required
                minLength={5}
              />
            </div>

            <Button type="submit" variant="destructive" size="sm" loading={unverifyPending}>
              {t("unverify")}
            </Button>
          </form>
        </details>
      ) : (
        <form action={verifyAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="success" size="sm" loading={verifyPending}>
            <BadgeCheck className="size-4" strokeWidth={2.5} aria-hidden />
            {t("verify")}
          </Button>
        </form>
      )}
    </div>
  );
}
