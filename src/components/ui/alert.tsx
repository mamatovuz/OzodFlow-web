import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Xabar bloki — forma xatolari, ogohlantirishlar, muvaffaqiyat xabarlari.
 *
 * `role` varianta qarab tanlanadi: xato va ogohlantirish `alert` bo'ladi
 * (ekran o'quvchi darhol o'qiydi), ma'lumot esa `status` (navbat bilan
 * o'qiladi). Hammasiga `alert` qo'ysak foydalanuvchini uzluksiz
 * to'xtatib turardik.
 */

const alertVariants = cva(
  "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
  {
    variants: {
      variant: {
        info: "border-info/25 bg-info-soft/60 text-info-soft-foreground",
        success: "border-success/25 bg-success-soft/60 text-success-soft-foreground",
        warning: "border-warning/30 bg-warning-soft/60 text-warning-soft-foreground",
        danger:
          "border-destructive/25 bg-destructive-soft/60 text-destructive-soft-foreground",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
} as const;

export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    title?: string;
    /** Ikonkani yashirish (matn o'zi yetarli bo'lganda) */
    hideIcon?: boolean;
  };

export function Alert({
  className,
  variant = "info",
  title,
  hideIcon,
  children,
  ...props
}: AlertProps) {
  const key = variant ?? "info";
  const Icon = ICONS[key];
  const isUrgent = key === "danger" || key === "warning";

  return (
    <div
      role={isUrgent ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon && <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />}

      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}
