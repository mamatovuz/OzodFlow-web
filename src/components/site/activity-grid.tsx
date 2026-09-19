import type { ActivityDay } from "@/lib/site";

// Faollik kartasi — otabek.io bilan 1:1: qorong'i karta, "Activites" sarlavhasi,
// 7 ustunli toza dumaloq katakchalar (raqamsiz, oysiz, badge'siz). Har oy uchun
// shu oydagi kunlar soni (28–31) qadar katak; faol kun yashil bo'ladi.
const ACTIVE_BG = [
  "", // 0 — pastda alohida
  "bg-emerald-500/45",
  "bg-emerald-500/65",
  "bg-emerald-400/85",
  "bg-emerald-400",
];

export function ActivityGrid({ cells }: { cells: (ActivityDay | null)[] }) {
  // Tekislash uchun qo'shilgan null'larni tashlaymiz — faqat haqiqiy kunlar,
  // chapdan o'ngga 7 tadan (referensdagidek).
  const days = cells.filter((c): c is ActivityDay => c !== null);

  return (
    <div className="act-card mx-auto w-full max-w-[385px] rounded-[24px] bg-[#27272a] px-7 pb-7 pt-6 shadow-[0_20px_30px_rgba(0,0,0,0.10),0_5px_12px_rgba(0,0,0,0.05)]">
      <h2 className="mb-4 text-sm font-semibold text-[#d4d4d8]">Activites</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((c, i) => (
          <div
            key={c.day}
            title={`${c.day} — ${c.count} harakat`}
            style={{ animationDelay: `${i * 16}ms` }}
            className={`act-cell aspect-square rounded-lg transition-colors duration-150 ${
              c.level > 0
                ? ACTIVE_BG[c.level]
                : "bg-[#343438] hover:bg-[#3f3f46]"
            } ${c.isToday && c.level === 0 ? "ring-1 ring-white/15" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
