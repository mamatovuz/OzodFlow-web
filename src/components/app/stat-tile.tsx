import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * STAT TILE — bitta ko'rsatkich.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UCHTA QAROR VA SABABLARI
 *
 *  1. Qiymat PROPORSIONAL raqamlar bilan chiziladi, tabular emas.
 *     Tabular har raqamga `0` ning kengligini beradi — bu ustunlarda
 *     kerak (raqamlar tekislanadi), lekin katta yakka sonda "121" kabi
 *     qiymat yoyilib, bo'sh ko'rinadi.
 *
 *  2. Qiymat SANS shriftda (display emas). Katta sonni display shriftda
 *     yozish uni ma'lumot emas, bezak qilib qo'yadi.
 *
 *  3. O'zgarish (delta) rangi YO'NALISHGA emas, MA'NOGA qarab tanlanadi.
 *     "Daromad +12%" — yaxshi (yashil). "Bekor qilingan loyihalar +12%" —
 *     yomon (qizil). Shuning uchun `upIsGood` majburiy fikrlash nuqtasi.
 *
 *  4. Delta faqat rang bilan ko'rsatilmaydi — strelka ikonkasi va ishora
 *     ham bor. Rang ko'rmaydigan foydalanuvchi ham o'sish/pasayishni
 *     tushunishi kerak.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type StatTileProps = {
  /** Gap ko'rinishida, oxirida ikki nuqta YO'Q */
  label: string;
  /** Tayyor formatlangan qiymat: "1 284", "4,9", "12,5 mln so'm" */
  value: string;
  /** Qiymat ostidagi qo'shimcha izoh */
  hint?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  delta?: {
    /** Foiz yoki mutlaq o'zgarish, ishorasiz: 12.5 */
    value: number;
    /** Nimaga nisbatan: "o'tgan oyga nisbatan" */
    versus: string;
    /**
     * Ko'rsatkichning O'SISHI yaxshimi.
     * Daromad uchun `true`, bekor qilingan loyihalar uchun `false`.
     */
    upIsGood: boolean;
  };
  /** Qiymatni ajratib ko'rsatish (asosiy ko'rsatkich uchun) */
  emphasis?: boolean;
  className?: string;
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  emphasis,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "surface-highlight flex flex-col rounded-2xl border border-border bg-card p-5",
        emphasis && "border-brand/25 bg-brand-soft/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Yorliq matn tokenida — hech qachon ko'rsatkich rangida emas */}
        <p className="text-[13px] font-medium leading-snug text-muted-foreground">
          {label}
        </p>

        {Icon && (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg",
              emphasis
                ? "bg-brand text-brand-foreground"
                : "bg-surface-2 text-muted-foreground"
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        )}
      </div>

      {/*
        `[font-variant-numeric:proportional-nums]` — global sozlama
        o'zgarsa ham bu qiymat proporsional qoladi.
      */}
      <p className="mt-3 font-sans text-[26px] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:proportional-nums]">
        {value}
      </p>

      {delta && <Delta {...delta} />}

      {hint && !delta && (
        <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Delta({
  value,
  versus,
  upIsGood,
}: NonNullable<StatTileProps["delta"]>) {
  const isFlat = value === 0;
  const isUp = value > 0;

  // Ma'no: o'sish yaxshimi yoki yomonmi.
  const isGood = isFlat ? null : isUp === upIsGood;

  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  const toneClass =
    isGood === null
      ? "text-muted-foreground"
      : isGood
        ? "text-success"
        : "text-destructive";

  const formatted = `${isUp ? "+" : isFlat ? "" : "−"}${Math.abs(value)
    .toFixed(Number.isInteger(value) ? 0 : 1)
    .replace(".", ",")}%`;

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug">
      <span className={cn("inline-flex items-center gap-0.5 font-medium", toneClass)}>
        <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        {formatted}
      </span>
      <span className="text-muted-foreground">{versus}</span>
    </p>
  );
}

/**
 * Ko'rsatkichlar qatori.
 *
 * `auto-fit` ishlatiladi: kartochkalar soni o'zgarsa ham qator to'g'ri
 * to'ldiriladi va oxirgi qatorda bitta cho'zilgan kartochka qolmaydi.
 */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]",
        className
      )}
    >
      {children}
    </div>
  );
}
