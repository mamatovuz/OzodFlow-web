import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import { Loader2, Minus, Plus, type LucideIcon } from "lucide-react";

// ─── Button ───
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary:
        "bg-accent text-white hover:bg-accent-hover shadow-soft disabled:opacity-50",
      secondary:
        "bg-surface-2 text-foreground hover:bg-border disabled:opacity-50",
      outline:
        "border border-border bg-card text-foreground hover:bg-surface-2 disabled:opacity-50",
      ghost: "text-muted hover:text-foreground hover:bg-surface-2",
      danger: "bg-error text-white hover:opacity-90 disabled:opacity-50",
    };
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ─── Input ───
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

// ─── Textarea ───
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// ─── Select ───
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

// ─── Label ───
export function Label({
  className,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

// ─── Card ───
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card shadow-soft",
        className
      )}
      {...props}
    />
  );
}

// ─── Badge ───
export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "error" | "accent";
}) {
  const variants = {
    default: "bg-surface-2 text-muted",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// ─── Switch (checkbox toggle) ───
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <span
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

// ─── Skeleton (yuklanish holati) ───
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

// ─── Spinner ───
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

// ─── EmptyState (bo'sh ro'yxat) ───
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
          <Icon className="h-6 w-6 text-muted" />
        </div>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Stat (KPI plitkasi) ───
export function Stat({
  label,
  value,
  icon: Icon,
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  delta?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {delta && (
        <div className={cn("mt-1 text-xs font-medium", delta.positive ? "text-success" : "text-error")}>
          {delta.value}
        </div>
      )}
    </div>
  );
}

// ─── IconButton ───
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "outline" }
>(({ className, variant = "ghost", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-9 w-9 items-center justify-center rounded-lg transition active:scale-95",
      variant === "outline"
        ? "border border-border bg-card text-foreground hover:bg-surface-2"
        : "text-muted hover:bg-surface-2 hover:text-foreground",
      className
    )}
    {...props}
  />
));
IconButton.displayName = "IconButton";

// ─── Stepper (miqdor tanlash: − N +) ───
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Kamaytirish"
        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground transition hover:bg-surface-2 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Oshirish"
        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground transition hover:bg-surface-2 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Tabs (boshqariladigan) ───
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex gap-1 rounded-xl bg-surface-2 p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === t.value ? "bg-card text-foreground shadow-soft" : "text-muted hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Interaktiv komponentlarni qayta eksport ───
export { Sheet } from "./ui-interactive";
