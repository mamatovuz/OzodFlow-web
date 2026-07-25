import { db } from "@/lib/db";

/**
 * Nishonlar (badge).
 *
 * `criteriaJson` — avtomatik berish sharti. Kelajakda fon vazifasi shu
 * shartlarni tekshirib nishon beradi. `null` bo'lsa nishon FAQAT QO'LDA
 * beriladi (masalan "Premium" — admin qarori bilan).
 *
 * Shart formati oddiy va o'qiladigan qilib saqlanadi, shunda admin panelda
 * ko'rsatish va tahrirlash mumkin bo'ladi.
 */

const BADGES: Array<{
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  criteria: Record<string, unknown> | null;
}> = [
  {
    slug: "verified",
    name: "Tasdiqlangan",
    description: "Shaxsi va hujjatlari admin tomonidan tekshirilgan.",
    icon: "BadgeCheck",
    tier: "BRONZE",
    // Shaxsni tasdiqlash o'tganda beriladi
    criteria: { identityVerified: true },
  },
  {
    slug: "trusted",
    name: "Ishonchli",
    description: "Kamida 10 loyiha muvaffaqiyatli yakunlangan va nizo bo'lmagan.",
    icon: "ShieldCheck",
    tier: "SILVER",
    criteria: { completedProjects: 10, maxDisputes: 0 },
  },
  {
    slug: "fast-delivery",
    name: "Tez topshiradi",
    description: "Oxirgi 10 loyihaning kamida 90 foizi muddatidan oldin topshirilgan.",
    icon: "Zap",
    tier: "SILVER",
    criteria: { onTimeRate: 90, minProjects: 10 },
  },
  {
    slug: "perfect-success",
    name: "100% muvaffaqiyat",
    description: "Barcha qabul qilingan loyihalar yakunlangan — bekor qilish yo'q.",
    icon: "Target",
    tier: "GOLD",
    criteria: { successRate: 100, minProjects: 15 },
  },
  {
    slug: "best-support",
    name: "Eng yaxshi aloqa",
    description: "Xabarlarga o'rtacha 1 soat ichida javob beradi.",
    icon: "MessageCircle",
    tier: "SILVER",
    criteria: { avgResponseMinutes: 60, minProjects: 5 },
  },
  {
    slug: "top-developer",
    name: "Top mutaxassis",
    description: "Reyting 4,8 dan yuqori va kamida 25 loyiha yakunlangan.",
    icon: "Trophy",
    tier: "GOLD",
    criteria: { ratingAvg: 4.8, completedProjects: 25 },
  },
  {
    slug: "elite",
    name: "Elita",
    description: "Elita darajasiga chiqqan mutaxassis.",
    icon: "Crown",
    tier: "PLATINUM",
    criteria: { level: "ELITE" },
  },
  {
    slug: "premium",
    name: "Premium",
    description: "Platforma tanlagan alohida mutaxassis. Faqat admin beradi.",
    icon: "Sparkles",
    tier: "PLATINUM",
    // Qo'lda beriladi — avtomatik shart yo'q
    criteria: null,
  },
];

export async function seedBadges(): Promise<number> {
  for (const [index, badge] of BADGES.entries()) {
    await db.badge.upsert({
      where: { slug: badge.slug },
      update: { sortOrder: index, isActive: true },
      create: {
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        tier: badge.tier,
        criteriaJson: badge.criteria ? JSON.stringify(badge.criteria) : null,
        sortOrder: index,
      },
    });
  }

  return BADGES.length;
}
