"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Checkbox.
 *
 * Radix'ning `Checkbox` komponenti haqiqiy `<input>` ELEMENTINI yasamaydi —
 * u `<button role="checkbox">`. Shu sababli oddiy formada (server action
 * bilan) qiymat YUBORILMAYDI.
 *
 * Shu sababli formalarda pastdagi `CheckboxField` ishlatiladi — u oddiy
 * `<input type="checkbox">` ga tayanadi va JavaScript o'chirilgan holatda
 * ham ishlaydi.
 */
export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-5 shrink-0 rounded-[5px] border border-input bg-card shadow-xs",
        "transition-[background-color,border-color,box-shadow] duration-150",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/**
 * Formada ishlatish uchun checkbox: yorliq bilan birga, `FormData` ga
 * qiymat yuboradi.
 *
 * Radix ishlatilmaydi — bu yerda oddiy `<input type="checkbox">` yetarli
 * va u JS'siz ham ishlaydi. Radix faqat murakkab holatlar (uch holatli
 * checkbox, boshqariladigan guruh) uchun kerak bo'ladi.
 */
export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  required,
  invalid,
  className,
  value,
}: {
  name: string;
  label: React.ReactNode;
  description?: string;
  defaultChecked?: boolean;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  /**
   * Yuboriladigan qiymat.
   *
   * KO'P TANLOVLI GURUH uchun kerak: bir xil `name` bilan bir necha
   * checkbox qo'yilsa, belgilanganlari massiv bo'lib keladi. `value`
   * berilmasa hammasi `"on"` yuboradi va qaysi biri belgilanganini
   * ajratib bo'lmaydi.
   */
  value?: string;
}) {
  // Guruhda `name` takrorlanadi, ya'ni `id` ham takrorlanardi — bu
  // yorliqni noto'g'ri inputga bog'lab qo'yadi. Qiymat bo'lsa uni
  // `id` ga qo'shamiz.
  const id = value ? `checkbox-${name}-${value}` : `checkbox-${name}`;
  const describedBy = description ? `${id}-description` : undefined;

  return (
    <div className={cn("flex gap-3", className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[5px] border border-input bg-card",
          "accent-brand",
          "focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
          "aria-invalid:border-destructive"
        )}
      />

      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-foreground">
          {label}
        </label>
        {description && (
          <p id={describedBy} className="mt-1 text-[13px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
