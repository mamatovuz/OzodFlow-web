"use client";

import { LogOut } from "lucide-react";
import { useActionState } from "react";

import { revokeDeviceAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Ko'rsatishga tayyor qurilma.
 *
 * `Date` emas, tayyor MATN: vaqtni serverda hisoblash hidratsiya
 * nomuvofiqligini butunlay yo'q qiladi.
 */
export type DeviceView = {
  id: string;
  name: string;
  ip: string | null;
  isCurrent: boolean;
  lastUsedLabel: string;
};

/**
 * Kirgan qurilmalar ro'yxati.
 *
 * NEGA KERAK: hisob o'g'irlanganini bilishning eng oddiy yo'li —
 * "menda bu qurilma yo'q" degan qatorni ko'rish. Uni darhol chiqarib
 * tashlash imkoni ham shu yerda.
 *
 * Bitta `useActionState` butun ro'yxatga: har qatorda alohida holat
 * saqlashning ma'nosi yo'q, chunki bir vaqtda bitta qurilma
 * chiqariladi va xabar ro'yxat tepasida ko'rsatiladi.
 */
export function DeviceList({
  devices,
  labels,
}: {
  devices: DeviceView[];
  labels: {
    empty: string;
    current: string;
    unknownIp: string;
    revoke: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    revokeDeviceAction,
    IDLE
  );

  return (
    <div className="flex flex-col gap-4">
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      {devices.length === 0 ? (
        // Nazariy holat: joriy sessiya doim ro'yxatda bo'lishi kerak.
        <p className="text-[15px] text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {device.name}

                  {device.isCurrent && (
                    <Badge variant="brand" size="sm">
                      {labels.current}
                    </Badge>
                  )}
                </p>

                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {device.ip ?? labels.unknownIp}
                  {" · "}
                  {device.lastUsedLabel}
                </p>
              </div>

              {/* Joriy qurilmada tugma yo'q — u "Chiqish" ning ishi. */}
              {!device.isCurrent && (
                <form action={formAction} className="shrink-0">
                  <input type="hidden" name="sessionId" value={device.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    loading={isPending}
                  >
                    <LogOut className="size-4" strokeWidth={2} aria-hidden />
                    {labels.revoke}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
