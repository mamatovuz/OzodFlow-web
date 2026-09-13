"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet — mobil'da pastdan chiqadigan panel (bottom sheet), desktopda
 * markazlashgan modal. Mahsulot detali, filtrlar, forma uchun.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  // Escape bilan yopish + fon scroll'ini bloklash
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "animate-sheet-up flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-card shadow-card",
          "sm:max-w-lg sm:rounded-2xl",
          className
        )}
      >
        {/* Mobil tutqich */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
          <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden" />
          <h3 className="mt-2 text-base font-semibold text-foreground sm:mt-0">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Drawer — desktopda o'ngdan chiqadigan yon panel, mobilda to'liq ekran
 * (pastdan). Buyurtma detali, mahsulot tahriri kabi kontekstli ko'rinishlar uchun.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 backdrop-blur-[2px] sm:items-stretch"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // Mobil: pastdan chiqadigan to'liq kenglikdagi list. Desktop: o'ngdan yon panel.
          "flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-card shadow-card animate-sheet-up",
          "sm:h-full sm:max-h-none sm:w-[440px] sm:max-w-full sm:rounded-none sm:rounded-l-2xl sm:animate-drawer-in",
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="ml-2 shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="shrink-0 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
