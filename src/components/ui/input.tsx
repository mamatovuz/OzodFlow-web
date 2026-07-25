import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Matn maydoni.
 *
 * `aria-invalid` bo'yicha xato ko'rinishi avtomatik qo'llanadi — alohida
 * `error` prop kerak emas. Sababi: `aria-invalid` ekran o'quvchi uchun
 * ham SHART, ya'ni u har holda qo'yilishi kerak. Uslubni shunga bog'lasak,
 * bittasini qo'yib ikkinchisini unutish imkoniyati yo'qoladi.
 */
export type InputProps = React.ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-2",
        "text-[15px] text-foreground shadow-xs",
        "transition-[border-color,box-shadow] duration-150",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        // Fayl maydoni uchun tugma ko'rinishi
        "file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground",
        // Xato holati — chegara va halqa qizil bo'ladi
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
        className
      )}
      {...props}
    />
  );
}

export type TextareaProps = React.ComponentProps<"textarea">;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "flex w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-2.5",
        "text-[15px] leading-relaxed text-foreground shadow-xs",
        "transition-[border-color,box-shadow] duration-150",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
        // Vertikal cho'zish mumkin, gorizontal emas — layout buzilmasin
        "resize-y",
        className
      )}
      {...props}
    />
  );
}
