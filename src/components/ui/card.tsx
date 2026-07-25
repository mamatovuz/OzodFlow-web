import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Kartochka — kabinet va admin paneldagi asosiy konteyner.
 *
 * `surface-highlight` sinfi qorong'i temada yuqori qirraga nozik yorug'lik
 * qo'shadi. Bu shunchaki bezak emas: to'q fonda soya ko'rinmaydi, ya'ni
 * qatlamlarni ajratadigan boshqa vosita kerak bo'ladi.
 */
export function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "surface-highlight rounded-2xl border border-border bg-card shadow-xs",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border-subtle p-5 sm:p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("font-display text-base font-semibold leading-snug", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border-subtle p-5 sm:px-6 sm:py-4",
        className
      )}
      {...props}
    />
  );
}

/**
 * Bo'sh holat.
 *
 * Har ro'yxatda qayta yozilmasligi uchun alohida komponent. Muhim detal:
 * bo'sh holat faqat "hech narsa yo'q" demaydi — NIMA QILISH kerakligini
 * ham aytadi. Aks holda foydalanuvchi boshi berk ko'chada qoladi.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-5 grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      )}

      <p className="font-display text-[15px] font-semibold">{title}</p>

      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
