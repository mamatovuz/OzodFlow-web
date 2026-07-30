"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card shadow-card animate-fade-up sm:rounded-2xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
