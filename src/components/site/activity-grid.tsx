import type { ActivityDay } from "@/lib/site";

// Faollik "yashil katakchalari" — FAQAT joriy oy (GitHub uslubi).
// Dark rounded karta, kalendar tartibida (Du..Ya). Kataklar navbatма-navbat
// "pop" animatsiya bilan chiqadi (CSS: .act-cell, site.css).
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

const LEVEL_BG = [
  "bg-white/[0.05]", // 0 — faoliyatsiz
  "bg-emerald-500/35",
  "bg-emerald-500/60",
  "bg-emerald-400/80",
  "bg-emerald-400", // 4 — eng faol
];

export function ActivityGrid({
  monthName,
  year,
  cells,
  totalActive,
}: {
  monthName: string;
  year: number;
  cells: (ActivityDay | null)[];
  totalActive: number;
}) {
  return (
    <div className="act-card relative overflow-hidden rounded-[26px] bg-neutral-900 p-5 text-white shadow-2xl ring-1 ring-white/10 sm:p-6">
      {/* yumshoq halo */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70" />
          <span className="text-sm font-semibold tracking-tight">Faollik</span>
          <span className="text-sm text-white/40">· {monthName} {year}</span>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">{totalActive} kun faol</span>
      </div>

      {/* Hafta kunlari sarlavhasi */}
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-medium text-white/30">{w}</div>
        ))}
      </div>

      {/* Kunlar */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((c, i) =>
          c === null ? (
            <div key={`e${i}`} />
          ) : (
            <div
              key={c.day}
              title={`${c.day} — ${c.count} harakat`}
              style={{ animationDelay: `${i * 22}ms` }}
              className={`act-cell group relative flex aspect-square items-center justify-center rounded-lg text-[10px] font-medium transition-transform hover:scale-110 sm:rounded-xl ${
                LEVEL_BG[c.level]
              } ${c.isToday ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-neutral-900" : ""} ${
                c.level >= 2 ? "text-neutral-900" : "text-white/45"
              }`}
            >
              {c.date}
            </div>
          )
        )}
      </div>

      {/* Izoh (kam → ko'p) */}
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-white/40">
        Kam
        {LEVEL_BG.map((cl, i) => (
          <span key={i} className={`h-[11px] w-[11px] rounded-[3px] ${cl}`} />
        ))}
        Ko&apos;p
      </div>
    </div>
  );
}
