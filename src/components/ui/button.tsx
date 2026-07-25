import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tugma.
 *
 * "Qimmat" ko'rinish uchta kichik detaldan yig'iladi:
 *
 *  1. `inset` box-shadow bilan yuqori qirrada nozik yorug'lik — tugma tekis
 *     to'rtburchak emas, ozgina qavariq ko'rinadi.
 *  2. Soya brend tusiga bo'yalgan (`shadow-brand`), sof qora emas.
 *  3. Bosilganda `scale(0.97)` va spring egri chizig'i — tugma bosilishga
 *     jismonan javob bergandek tuyuladi.
 *
 * Bu uchtasi birgalikda ishlaganda tugma "shablon" emas, ishlangan ko'rinadi.
 */

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-lg font-medium",
    "transition-[background-color,box-shadow,transform,color,border-color]",
    "duration-150 ease-[var(--ease-out-quart)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    // Ikonkalar matn bilan bir xil optik o'lchamda turadi
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "active:scale-[0.97] active:duration-75",
  ],
  {
    variants: {
      variant: {
        /** Asosiy harakat. Sahifada bittadan ko'p bo'lmasligi kerak. */
        brand: [
          "bg-brand text-brand-foreground shadow-brand",
          "shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.16)]",
          "hover:bg-brand-hover",
          "active:bg-brand-active",
        ],
        /** Ikkinchi darajali harakat — sirt va chegara bilan. */
        secondary: [
          "border border-border bg-card text-foreground shadow-xs",
          "hover:bg-surface-2 hover:border-input",
        ],
        /** Chegarasiz — panellar va jadval qatorlaridagi harakatlar uchun. */
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        /** Faqat chegara — to'q fonda ishlatiladi. */
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-surface-2",
        ],
        /** O'chirish va qaytarib bo'lmaydigan harakatlar. */
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.14)]",
          "hover:brightness-110",
          "focus-visible:ring-destructive",
        ],
        /** Tasdiqlash, to'lovni chiqarish kabi ijobiy yakuniy harakatlar. */
        success: [
          "bg-success text-success-foreground shadow-sm",
          "shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.14)]",
          "hover:brightness-110",
          "focus-visible:ring-success",
        ],
        /** Matn havolasi ko'rinishidagi tugma. */
        link: "text-brand underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
      /** Konteyner bo'ylab cho'ziladi — mobil formalarda kerak bo'ladi. */
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Tugmani boshqa elementga aylantiradi (masalan `<Link>`). */
    asChild?: boolean;
    /**
     * Yuklanish holati. Tugma o'lchami O'ZGARMAYDI — matn joyida qoladi,
     * ustiga spinner chiqadi. Aks holda tugma sakrab, sichqoncha nishonini
     * yo'qotadi.
     *
     * `asChild` bilan birga ishlamaydi (pastdagi izohga qarang).
     */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  /**
   * `asChild` rejimi alohida ishlanadi: Radix `Slot` AYNAN BITTA element
   * qabul qiladi va o'z proplarini unga ko'chiradi. Quyidagi oddiy holatda
   * matn ikki `<span>` ichiga o'raladi — bu Slot uchun ikkita child bo'lib,
   * xato beradi.
   *
   * Shu sababli `asChild` da children o'zgarishsiz uzatiladi. Yuklanish
   * holati bu rejimda qo'llanmaydi — u odatda `<Link>` uchun ishlatiladi,
   * havolada esa spinner kerak bo'lmaydi.
   */
  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      // Ekran o'quvchiga yuklanish holatini bildiradi
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-4 animate-spin" aria-hidden />
        </span>
      )}
      {/* Yuklanishda matn ko'rinmaydi, lekin joyni egallab turadi —
          shu sabab tugmaning kengligi o'zgarmaydi. */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
      </span>
    </button>
  );
}

export { buttonVariants };
