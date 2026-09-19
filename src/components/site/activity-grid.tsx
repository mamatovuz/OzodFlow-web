import type { ActivityDay } from "@/lib/site";

// GitHub uslubidagi "yashil katakchalar" — bosh sahifadagi "Faollik" kartasi.
// Server komponent: har kun rangi faollik darajasiga (0–4) qarab.
const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

const LEVEL_BG = [
  "bg-white/[0.04]", // 0 — faoliyatsiz
  "bg-emerald-500/40",
  "bg-emerald-500/60",
  "bg-emerald-400/80",
  "bg-emerald-400", // 4 — eng faol
];

export function ActivityGrid({
  year,
  weeks,
  totalActive,
}: {
  year: number;
  weeks: (ActivityDay | null)[][];
  totalActive: number;
}) {
  // Har ustun tepasida oy nomi (oy birinchi marta boshlangan ustunda)
  const monthLabels: (string | null)[] = weeks.map((w) => {
    const firstReal = w.find((d) => d && Number(d.day.slice(8, 10)) <= 7);
    if (!firstReal) return null;
    return MONTHS[Number(firstReal.day.slice(5, 7)) - 1];
  });
  let lastMonth = "";

  return (
    <div className="rounded-3xl bg-neutral-900 p-5 text-white shadow-xl ring-1 ring-white/10 dark:bg-neutral-900 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">Faollik</span>
        <span className="text-xs text-white/50">{totalActive} kun faol</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          {/* Oylar qatori */}
          <div className="flex gap-[3px] pl-0 text-[9px] text-white/40">
            {monthLabels.map((m, i) => {
              const show = m && m !== lastMonth;
              if (m) lastMonth = m;
              return (
                <span key={i} className="w-[11px] shrink-0 sm:w-[13px]">
                  {show ? m : ""}
                </span>
              );
            })}
          </div>

          {/* 7 qator (Du..Ya) — katakchalar */}
          <div className="flex gap-[3px]">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {w.map((d, di) => (
                  <span
                    key={di}
                    title={d ? `${d.day} — ${d.count} harakat` : ""}
                    className={`h-[11px] w-[11px] rounded-[3px] sm:h-[13px] sm:w-[13px] ${
                      d ? LEVEL_BG[d.level] : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Izoh (kam → ko'p) */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-white/40">
        <span>{year}</span>
        <span className="flex items-center gap-1">
          Kam
          {LEVEL_BG.map((c, i) => (
            <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />
          ))}
          Ko&apos;p
        </span>
      </div>
    </div>
  );
}
