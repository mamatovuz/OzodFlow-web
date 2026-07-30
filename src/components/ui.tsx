import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  HTMLAttributes,
} from "react";

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
