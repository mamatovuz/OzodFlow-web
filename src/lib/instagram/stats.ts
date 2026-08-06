/**
 * Instagram kunlik statistika agregatlari (grafik va analitika uchun).
 */
import { prisma } from "@/lib/prisma";

function todayKey(tz = "Asia/Tashkent"): string {
  // YYYY-MM-DD (restoran timezone)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type IgStatField =
  | "comments"
  | "dms"
  | "replies"
  | "buttonClicks"
  | "newFollowers"
  | "conversions";

/** Bugungi kun statistikasini oshiradi (upsert) */
export async function bumpStat(
  restaurantId: string,
  field: IgStatField,
  by = 1,
  tz = "Asia/Tashkent"
): Promise<void> {
  const date = todayKey(tz);
  await prisma.instagramStatistic
    .upsert({
      where: { restaurantId_date: { restaurantId, date } },
      create: { restaurantId, date, [field]: by } as any,
      update: { [field]: { increment: by } } as any,
    })
    .catch(() => {});
}

/** Oxirgi N kun statistikasi (grafik uchun, bo'sh kunlar 0 bilan to'ldiriladi) */
export async function getDailyStats(restaurantId: string, days = 30, tz = "Asia/Tashkent") {
  const rows = await prisma.instagramStatistic.findMany({
    where: { restaurantId },
    orderBy: { date: "desc" },
    take: days,
  });
  const map = new Map(rows.map((r) => [r.date, r]));

  const out: {
    date: string;
    comments: number;
    dms: number;
    replies: number;
    buttonClicks: number;
    newFollowers: number;
    conversions: number;
  }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const r = map.get(key);
    out.push({
      date: key,
      comments: r?.comments ?? 0,
      dms: r?.dms ?? 0,
      replies: r?.replies ?? 0,
      buttonClicks: r?.buttonClicks ?? 0,
      newFollowers: r?.newFollowers ?? 0,
      conversions: r?.conversions ?? 0,
    });
  }
  return out;
}

/** Bugungi umumiy ko'rsatkichlar (dashboard kartalari uchun) */
export async function getTodayStats(restaurantId: string, tz = "Asia/Tashkent") {
  const date = todayKey(tz);
  const r = await prisma.instagramStatistic.findUnique({
    where: { restaurantId_date: { restaurantId, date } },
  });
  return {
    comments: r?.comments ?? 0,
    dms: r?.dms ?? 0,
    replies: r?.replies ?? 0,
    buttonClicks: r?.buttonClicks ?? 0,
    newFollowers: r?.newFollowers ?? 0,
    conversions: r?.conversions ?? 0,
    conversionRate:
      (r?.replies ?? 0) > 0 ? Math.round(((r?.conversions ?? 0) / (r?.replies ?? 1)) * 100) : 0,
  };
}
