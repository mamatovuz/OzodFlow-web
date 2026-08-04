"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ishlab chiqarishda bu yerni Sentry/logga ulash mumkin
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
          <AlertTriangle className="h-7 w-7 text-error" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-foreground">Nimadir xato ketdi</h1>
        <p className="mt-2 text-sm text-muted">
          Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring. Muammo takrorlansa,
          administrator bilan bog'laning.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            <RotateCw className="h-4 w-4" />
            Qayta urinish
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-2"
          >
            <Home className="h-4 w-4" />
            Bosh sahifa
          </a>
        </div>
      </div>
    </div>
  );
}
