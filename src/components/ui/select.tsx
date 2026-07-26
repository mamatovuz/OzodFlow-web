import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tanlash maydoni — NATIVE `<select>`.
 *
 * Radix Select ATAYLAB ishlatilmadi. Sabablari:
 *
 *   • native select JavaScript'siz ham ishlaydi (progressive enhancement)
 *   • mobil qurilmada tizimning o'z tanlagichi ochiladi — u barmoq bilan
 *     ishlashga moslashgan va foydalanuvchiga tanish
 *   • forma yuborilganda qiymat o'zi `FormData` ga tushadi
 *   • klaviatura va ekran o'quvchi bilan ishlashi brauzer tomonidan
 *     ta'minlanadi, bizning kodimizga bog'liq emas
 *
 * Radix faqat murakkab holatlarda kerak: ichida rasm/nishon bo'lgan
 * variantlar, guruhlangan qidiruv, ko'p tanlov.
 */
export type SelectProps = React.ComponentProps<"select">;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card",
          "px-3.5 pr-10 text-[15px] text-foreground shadow-xs",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
          className
        )}
        {...props}
      >
        {children}
      </select>

      {/* `appearance-none` brauzer strelkasini o'chiradi — o'zimiznikini
          qo'yamiz. `pointer-events-none` — ustiga bosilganda select ochiladi. */}
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}
