"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { moderateProjectAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

export function ModerationActions({ projectId }: { projectId: string }) {
  const t = useTranslations("admin.moderation");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    moderateProjectAction,
    IDLE
  );

  if (state.status === "success") {
    return <Alert variant="success">{state.message}</Alert>;
  }

  return (
    <div className="flex flex-col gap-3">
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <div className="flex flex-wrap items-start gap-2">
        {/* Tasdiqlash — sabab kerak emas */}
        <form action={formAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="decision" value="approve" />
          <Button type="submit" variant="success" size="sm" loading={isPending}>
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
            {t("approve")}
          </Button>
        </form>

        {/* Rad etish — sabab MAJBURIY, mijoz nimani tuzatishni bilishi kerak */}
        <details>
          <summary className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
            <X className="size-4" strokeWidth={2} aria-hidden />
            {t("reject")}
          </summary>

          <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value="reject" />

            <div className="min-w-[18rem] flex-1">
              <label
                htmlFor={`reject-${projectId}`}
                className="text-[13px] font-medium"
              >
                {t("rejectReason")}
              </label>
              <Input
                id={`reject-${projectId}`}
                name="reason"
                className="mt-1 h-9"
                placeholder="Tavsif juda umumiy, aniqlashtirish kerak"
                minLength={10}
                required
              />
            </div>

            <Button type="submit" variant="destructive" size="sm" loading={isPending}>
              {t("reject")}
            </Button>
          </form>
        </details>
      </div>
    </div>
  );
}
