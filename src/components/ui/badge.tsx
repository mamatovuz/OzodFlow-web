import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Nishon (badge) — holat, daraja va teg ko'rsatish uchun.
 *
 * Ranglar `*-soft` tokenlaridan olinadi: to'q emas, yengil tusli fon va
 * to'yingan matn. Sabab — jadvalda 20 ta to'q nishon bo'lsa sahifa
 * "chiroqlar bayrami" ga o'xshab qoladi; yengil fon ma'noni saqlab,
 * ko'zni tinch qoldiradi.
 */

const badgeVariants = cva(
  [
    "inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium",
    "whitespace-nowrap transition-colors",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        brand: "border-transparent bg-brand-soft text-brand-soft-foreground",
        success: "border-transparent bg-success-soft text-success-soft-foreground",
        warning: "border-transparent bg-warning-soft text-warning-soft-foreground",
        danger:
          "border-transparent bg-destructive-soft text-destructive-soft-foreground",
        info: "border-transparent bg-info-soft text-info-soft-foreground",
        /** To'q variant — faqat alohida urg'u kerak bo'lganda. */
        solid: "border-transparent bg-brand text-brand-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
      size: {
        sm: "h-5 px-1.5 text-[11px] [&_svg]:size-3",
        md: "h-6 px-2 text-xs [&_svg]:size-3.5",
        lg: "h-7 px-2.5 text-[13px] [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

/**
 * Holat nuqtasi — nishon ichida ishlatiladi ("• Faol").
 * `animate` bilan sekin pulsatsiya qiladi: real vaqt holatini bildiradi.
 */
export function StatusDot({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      {animate && (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-60",
            className ?? "bg-success"
          )}
        />
      )}
      <span
        className={cn("relative size-2 rounded-full", className ?? "bg-success")}
      />
    </span>
  );
}

export { badgeVariants };
