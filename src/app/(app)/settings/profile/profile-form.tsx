"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Ism va ommaviy manzil.
 *
 * Parol talab qilinmaydi — bu ma'lumot ochiq va uni o'zgartirish
 * hisobni egallab olishga yo'l bermaydi.
 */
export function ProfileForm({
  name,
  username,
  profileUrlPrefix,
  showUsername,
}: {
  name: string;
  username: string | null;
  profileUrlPrefix: string;
  showUsername: boolean;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateProfileAction,
    IDLE
  );

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <Field name="name" label="Ism" errors={errors?.name} required>
        {(props) => (
          <Input
            {...props}
            defaultValue={name}
            autoComplete="name"
            maxLength={80}
          />
        )}
      </Field>

      {showUsername && (
        <Field
          name="username"
          label="Ommaviy manzil"
          hint={`Profilingiz ${profileUrlPrefix}manzil ko'rinishida ochiladi. Keyinroq o'zgartirsangiz eski havola ishlamaydi.`}
          errors={errors?.username}
        >
          {(props) => (
            <div className="flex items-stretch">
              {/* Prefiks ko'rinadigan qism — foydalanuvchi to'liq
                  manzilni yozib yubormasligi uchun. */}
              <span className="inline-flex shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-surface-2 px-3 text-[13px] text-muted-foreground">
                {profileUrlPrefix}
              </span>
              <Input
                {...props}
                defaultValue={username ?? ""}
                placeholder="ismingiz"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                className="rounded-l-none"
              />
            </div>
          )}
        </Field>
      )}

      <div>
        <Button type="submit" loading={isPending}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
