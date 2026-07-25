import { cn } from "@/lib/utils";

/**
 * Bo'lim sarlavhasi — barcha marketing bo'limlari shundan foydalanadi.
 *
 * Nega alohida komponent: sarlavha o'lchami, harf oralig'i va yorliq
 * ko'rinishi bo'limlar bo'ylab AYNAN bir xil bo'lishi kerak. Har bo'limda
 * qo'lda yozilsa, vaqt o'tib biri 3xl, boshqasi 4xl bo'lib ketadi va
 * sahifa yig'ilmagan ko'rinadi.
 */
export function SectionHeading({
  label,
  title,
  subtitle,
  align = "center",
  className,
}: {
  /** Kichik yuqori yorliq: "Ishonch", "Xizmatlar" */
  label?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {label && (
        <span className="inline-flex items-center rounded-full border border-border bg-surface-1 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      )}

      <h2
        className={cn(
          "font-display text-3xl font-bold leading-[1.12] text-balance sm:text-4xl",
          align === "center" && "max-w-2xl"
        )}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={cn(
            "text-base leading-relaxed text-muted-foreground text-pretty sm:text-[17px]",
            align === "center" ? "max-w-2xl" : "max-w-xl"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Bo'limlar orasidagi bir xil vertikal bo'shliq. */
export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      {children}
    </section>
  );
}
