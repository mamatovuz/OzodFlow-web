/**
 * Keyword moslashtirish va jadval (schedule) tekshiruvi.
 */
import type { IgMatchType, IgSchedule } from "./types";

/** Matndan keyword'ni topadi (matchType + caseSensitive bo'yicha) */
export function keywordMatches(
  text: string,
  word: string,
  matchType: IgMatchType,
  caseSensitive: boolean
): boolean {
  if (!word) return false;
  let hay = text || "";
  let needle = word;
  if (!caseSensitive) {
    hay = hay.toLowerCase();
    needle = needle.toLowerCase();
  }
  hay = hay.trim();
  needle = needle.trim();
  switch (matchType) {
    case "EQUALS":
      return hay === needle;
    case "STARTS_WITH":
      return hay.startsWith(needle);
    case "ENDS_WITH":
      return hay.endsWith(needle);
    case "CONTAINS":
    default:
      // so'z chegarasini hisobga olgan holda "contains"
      return hay.includes(needle);
  }
}

/** Bir nechta keyworddan kamida bittasi mos kelsa true */
export function anyKeywordMatches(
  text: string,
  words: string[],
  matchType: IgMatchType,
  caseSensitive: boolean
): boolean {
  return words.some((w) => keywordMatches(text, w, matchType, caseSensitive));
}

/** Ignore ro'yxatidagi so'z bormi (bu holda qoida ishlamaydi) */
export function isIgnored(text: string, ignoreWords: string[]): boolean {
  if (!ignoreWords.length) return false;
  const t = (text || "").toLowerCase();
  return ignoreWords.some((w) => w && t.includes(w.toLowerCase()));
}

/** Berilgan vaqtda jadval bo'yicha ishlash mumkinmi */
export function isWithinSchedule(schedule: IgSchedule | null | undefined, now = new Date()): boolean {
  if (!schedule || schedule.mode === "ALWAYS") return true;

  const tz = schedule.tz || "Asia/Tashkent";
  // Timezone bo'yicha soat va hafta kunini olamiz
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = weekdayMap[weekdayStr] ?? 0;
  const nowMin = hour * 60 + minute;

  if (schedule.mode === "WEEKEND") {
    return weekday === 0 || weekday === 6;
  }

  if (schedule.mode === "CUSTOM" && schedule.days && schedule.days.length) {
    if (!schedule.days.includes(weekday)) return false;
  }

  // HOURS yoki CUSTOM (kun mos kelsa) — soat oralig'i
  if ((schedule.mode === "HOURS" || schedule.mode === "CUSTOM") && schedule.from && schedule.to) {
    const [fh, fm] = schedule.from.split(":").map(Number);
    const [th, tm] = schedule.to.split(":").map(Number);
    const fromMin = fh * 60 + (fm || 0);
    const toMin = th * 60 + (tm || 0);
    if (fromMin <= toMin) {
      return nowMin >= fromMin && nowMin <= toMin;
    }
    // tunni kesib o'tuvchi oraliq (masalan 22:00–06:00)
    return nowMin >= fromMin || nowMin <= toMin;
  }

  return true;
}

/** Bot/spam ko'rinishidagi comment (juda qisqa yoki faqat emoji/havola) */
export function looksLikeSpam(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  // faqat havola
  if (/^https?:\/\/\S+$/i.test(t)) return true;
  return false;
}

/** delaySec + randomDelay bo'yicha kutish (ms) hisoblaydi */
export function computeDelayMs(delaySec: number, random: boolean): number {
  const base = Math.max(0, delaySec) * 1000;
  if (!random || base === 0) return base;
  // 0..base oralig'ida tasodifiy (tabiiy ko'rinish uchun)
  return Math.floor(Math.random() * base);
}
