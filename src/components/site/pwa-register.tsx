"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Service worker'ni ro'yxatdan o'tkazadi va "O'rnatish" taklifini ko'rsatadi.
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/site-sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
      <Download className="h-5 w-5 text-accent" />
      <div className="text-sm">
        <p className="font-medium leading-none">Ilova sifatida o'rnating</p>
        <p className="mt-0.5 text-xs text-muted">Tez kirish uchun bosh ekranga qo'shing</p>
      </div>
      <button
        onClick={async () => {
          try {
            await deferred.prompt();
            await deferred.userChoice;
          } catch {}
          setDeferred(null);
        }}
        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
      >
        O'rnatish
      </button>
      <button onClick={() => setHidden(true)} aria-label="Yopish" className="text-muted hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
