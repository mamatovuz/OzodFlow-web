import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  /** Majburiy maydon belgisi */
  required?: boolean;
};

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-foreground",
        // Nofaol maydonning yorlig'i ham xiralashadi
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        // Yulduzcha ekran o'quvchiga o'qilmaydi: majburiylik `required`
        // atributi orqali allaqachon e'lon qilingan, ikki marta aytish
        // ortiqcha shovqin bo'ladi.
        <span className="text-destructive" aria-hidden>
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
}
