import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Forma maydoni: yorliq + kiritish + izoh + xato.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA ALOHIDA KOMPONENT
 *
 *  Xatoni ekran o'quvchiga to'g'ri yetkazish uchun uch narsa kerak:
 *    • `<input aria-invalid>`            — maydon xato holatida
 *    • `<input aria-describedby="...">`  — xato matniga havola
 *    • xato matni `role="alert"` bilan   — paydo bo'lganda o'qiladi
 *
 *  Bu uchtasini har maydonda qo'lda yozish — birini unutish demak.
 *  Komponent id'larni o'zi bog'laydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type FieldProps = {
  /** `name` atributi — id va xato bog'lanishi shundan yasaladi */
  name: string;
  label: React.ReactNode;
  /** Maydon ostidagi yordamchi matn */
  hint?: string;
  /** Xato xabarlari — server action natijasidan keladi */
  errors?: string[];
  required?: boolean;
  className?: string;
  /**
   * Kiritish elementi. Funksiya sifatida beriladi, chunki komponent unga
   * `id`, `aria-invalid` va `aria-describedby` qiymatlarini uzatadi.
   */
  children: (props: {
    id: string;
    name: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
    required: boolean | undefined;
  }) => React.ReactNode;
};

export function Field({
  name,
  label,
  hint,
  errors,
  required,
  className,
  children,
}: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors && errors.length > 0 ? `${id}-error` : undefined;

  // Ikkalasi ham bo'lsa ikkisiga ham havola qilamiz — ekran o'quvchi
  // avval izohni, keyin xatoni o'qiydi.
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>

      {children({
        id,
        name,
        "aria-invalid": errorId ? true : undefined,
        "aria-describedby": describedBy,
        required: required || undefined,
      })}

      {hint && !errorId && (
        <p id={hintId} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}

      {errorId && (
        <div id={errorId} role="alert" className="flex flex-col gap-0.5">
          {errors?.map((error) => (
            <p key={error} className="text-[13px] leading-snug text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
