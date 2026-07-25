import { db } from "@/lib/db";
import { ProjectStatus } from "@/lib/enums";

/**
 * Ommaviy sahifalar uchun ma'lumot o'qish.
 *
 * MUHIM: har bir funksiya try/catch ichida va bo'sh natija qaytaradi.
 *
 * Sababi ikkita:
 *  1. `next build` sahifalarni oldindan render qiladi. Docker image yasashda
 *     database hali mavjud bo'lmaydi — so'rov xato bersa build yiqilardi.
 *  2. Marketing sahifasi platformaning eng muhim sahifasi. Bitta so'rov
 *     ishlamagani uchun butun bosh sahifa 500 qaytarishi mumkin emas.
 */

/** So'rov xato bersa jimgina zaxira qiymat qaytaradi (log bilan). */
async function safely<T>(label: string, query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(`[marketing] "${label}" so'rovi bajarilmadi:`, error);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kategoriyalar
// ─────────────────────────────────────────────────────────────────────────────

export type MarketingCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  projectCount: number;
};

/** Bosh sahifada ko'rsatiladigan asosiy kategoriyalar. */
export async function getFeaturedCategories(limit = 8): Promise<MarketingCategory[]> {
  return safely(
    "featuredCategories",
    async () => {
      const categories = await db.category.findMany({
        where: {
          isActive: true,
          // Faqat yuqori darajali kategoriyalar — bosh sahifada ichki
          // bo'limlarni ko'rsatish ro'yxatni chalkashtiradi.
          parentId: null,
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          icon: true,
          accent: true,
          _count: {
            select: {
              projects: {
                where: { status: { in: [ProjectStatus.OPEN, ProjectStatus.COMPLETED] } },
              },
            },
          },
        },
      });

      return categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        accent: category.accent,
        projectCount: category._count.projects,
      }));
    },
    []
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutaxassislar
// ─────────────────────────────────────────────────────────────────────────────

export type MarketingDeveloper = {
  username: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  level: string;
  ratingAvg: number;
  ratingCount: number;
  completedProjects: number;
  skills: string[];
  isAvailable: boolean;
};

/**
 * Bosh sahifada ko'rsatiladigan mutaxassislar.
 *
 * Tanlov mezoni: tasdiqlangan, ochiq profili bor va reyting bo'yicha yuqorida.
 * `isFeatured` admin qo'lda ko'targan profillarni oldinga chiqaradi.
 */
export async function getFeaturedDevelopers(limit = 6): Promise<MarketingDeveloper[]> {
  return safely(
    "featuredDevelopers",
    async () => {
      const profiles = await db.developerProfile.findMany({
        where: {
          // Tasdiqlanmagan profil ommaviy ko'rinmaydi
          verifiedAt: { not: null },
          user: {
            status: "ACTIVE",
            deletedAt: null,
            // Ommaviy profil manzili uchun username shart
            username: { not: null },
          },
        },
        orderBy: [
          { isFeatured: "desc" },
          { ratingAvg: "desc" },
          { completedProjects: "desc" },
        ],
        take: limit,
        select: {
          headline: true,
          level: true,
          ratingAvg: true,
          ratingCount: true,
          completedProjects: true,
          acceptingWork: true,
          availability: true,
          user: {
            select: { username: true, name: true, avatarUrl: true },
          },
          skills: {
            take: 4,
            orderBy: { level: "desc" },
            select: { skill: { select: { name: true } } },
          },
        },
      });

      return profiles
        // `username: { not: null }` filtri bo'lsa ham TS uni null deb biladi,
        // shuning uchun aniq tekshirib o'tamiz.
        .filter((profile) => profile.user.username !== null)
        .map((profile) => ({
          username: profile.user.username as string,
          name: profile.user.name,
          avatarUrl: profile.user.avatarUrl,
          headline: profile.headline,
          level: profile.level,
          ratingAvg: profile.ratingAvg,
          ratingCount: profile.ratingCount,
          completedProjects: profile.completedProjects,
          skills: profile.skills.map((entry) => entry.skill.name),
          isAvailable: profile.acceptingWork && profile.availability === "AVAILABLE",
        }));
    },
    []
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistika
// ─────────────────────────────────────────────────────────────────────────────

export type PlatformStats = {
  completedProjects: number;
  verifiedDevelopers: number;
  /** O'rtacha reyting (1..5). Sharh bo'lmasa `null`. */
  averageRating: number | null;
  /** Muddatda topshirilgan loyihalar foizi. Ma'lumot yetmasa `null`. */
  onTimePercent: number | null;
};

/**
 * Platforma statistikasi.
 *
 * ATAYLAB HAQIQIY MA'LUMOT: bu raqamlar databasedan hisoblanadi, kodda
 * yozilgan emas. Yangi platformada "500+ loyiha" deb yozish — mijozni
 * chalg'itish va haqiqiy biznes sayti uchun yaramaydi.
 *
 * Ma'lumot yetarli bo'lmaganda tegishli maydon `null` qaytadi va bosh
 * sahifada o'sha ko'rsatkich KO'RSATILMAYDI.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  return safely(
    "platformStats",
    async () => {
      const [completedProjects, verifiedDevelopers, ratingAggregate, deliveryStats] =
        await Promise.all([
          db.project.count({ where: { status: ProjectStatus.COMPLETED } }),

          db.developerProfile.count({
            where: {
              verifiedAt: { not: null },
              user: { status: "ACTIVE", deletedAt: null },
            },
          }),

          db.review.aggregate({
            where: { isPublic: true, isHidden: false },
            _avg: { rating: true },
            _count: { rating: true },
          }),

          // Muddatda topshirish: tugallangan va deadline'i belgilangan loyihalar
          db.project.findMany({
            where: {
              status: ProjectStatus.COMPLETED,
              deadlineAt: { not: null },
              completedAt: { not: null },
            },
            select: { deadlineAt: true, completedAt: true },
          }),
        ]);

      // O'rtacha reytingni faqat kamida 5 ta sharh bo'lganda ko'rsatamiz —
      // bitta 5 yulduzli sharhdan "o'rtacha 5,0" yasash chalg'ituvchi.
      const averageRating =
        ratingAggregate._count.rating >= 5 && ratingAggregate._avg.rating !== null
          ? Math.round(ratingAggregate._avg.rating * 10) / 10
          : null;

      const onTimePercent =
        deliveryStats.length >= 5
          ? Math.round(
              (deliveryStats.filter(
                (project) =>
                  project.completedAt !== null &&
                  project.deadlineAt !== null &&
                  project.completedAt <= project.deadlineAt
              ).length /
                deliveryStats.length) *
                100
            )
          : null;

      return { completedProjects, verifiedDevelopers, averageRating, onTimePercent };
    },
    {
      completedProjects: 0,
      verifiedDevelopers: 0,
      averageRating: null,
      onTimePercent: null,
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Savol-javob va tavsiyalar (CMS'dan)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublicFaqs(category = "general") {
  return safely(
    "publicFaqs",
    () =>
      db.faq.findMany({
        where: { isActive: true, category },
        orderBy: { sortOrder: "asc" },
        select: { id: true, question: true, answer: true },
      }),
    []
  );
}

export async function getFeaturedTestimonials(limit = 3) {
  return safely(
    "featuredTestimonials",
    () =>
      db.testimonial.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: { sortOrder: "asc" },
        take: limit,
        select: {
          id: true,
          authorName: true,
          authorRole: true,
          avatarUrl: true,
          body: true,
          rating: true,
        },
      }),
    []
  );
}
