import { Coffee, Send } from "lucide-react";

// "Menga kofe sotib oling" + Telegram — qo'llab-quvvatlash bloki (6-rasm uslubi).
export function CoffeeCard({
  coffeeUrl,
  channel,
  title = "Kontentdan zavqlanyapsizmi?",
  subtitle = "Ushbu platformalar orqali meni qo'llab-quvvatlashni o'ylab ko'ring!",
}: {
  coffeeUrl?: string;
  channel?: string;
  title?: string;
  subtitle?: string;
}) {
  if (!coffeeUrl && !channel) return null;

  return (
    <div className="text-center">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{subtitle}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {coffeeUrl && (
          <a
            href={coffeeUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-left transition-transform hover:-translate-y-0.5 dark:border-amber-500/30 dark:bg-amber-500/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-900 shadow-sm">
              <Coffee className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-amber-900 dark:text-amber-200">Menga kofe sotib oling</span>
              <span className="mt-0.5 block text-sm text-amber-800/70 dark:text-amber-200/60">
                Agar bu sizga foydali bo'lsa, menga kofe sotib oling!
              </span>
            </span>
          </a>
        )}

        {channel && (
          <a
            href={channel}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-sky-300/60 bg-sky-50 p-5 text-left transition-transform hover:-translate-y-0.5 dark:border-sky-500/30 dark:bg-sky-500/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
              <Send className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-sky-900 dark:text-sky-200">Telegram</span>
              <span className="mt-0.5 block text-sm text-sky-800/70 dark:text-sky-200/60">
                Ko'proq kontent uchun Telegram kanalimga qo'shiling!
              </span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
