"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
          <AlertTriangle className="h-7 w-7 text-error" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">Xatolik yuz berdi</h2>
        <p className="mt-2 text-sm text-muted">
          Admin panelining ushbu bo'limida kutilmagan xatolik. Qayta urinib ko'ring.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          <RotateCw className="h-4 w-4" />
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
