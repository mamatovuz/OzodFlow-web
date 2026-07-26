import { db } from "@/lib/db";
import { readStringList } from "@/lib/json-field";
import type { Tiyin } from "@/lib/money";

/**
 * OMMAVIY MUTAXASSIS PROFILLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  KO'RINISH QOIDASI
 *
 *  Profil ommaviy bo'lishi uchun UCH shart birga bajarilishi kerak:
 *    1. `verifiedAt` — admin arizani tasdiqlagan
 *    2. `user.status === ACTIVE` va o'chirilmagan
 *    3. `username` mavjud — profil manzili shundan yasaladi
 *
 *  Shart so'rovning O'ZIDA turadi, komponentda emas. Aks holda yangi
 *  sahifa yozilganda tasdiqlanmagan profil ochiq qolib ketishi mumkin.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Ommaviy profillar uchun umumiy filtr — bir joyda. */
const PUBLIC_PROFILE_FILTER = {
  verifiedAt: { not: null },
  user: {
    status: "ACTIVE",
    deletedAt: null,
    username: { not: null },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Ro'yxat
// ─────────────────────────────────────────────────────────────────────────────

export type DeveloperCard = {
  username: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  level: string;
  ratingAvg: number;
  ratingCount: number;
  completedProjects: number;
  hourlyRate: Tiyin;
  isAvailable: boolean;
  isFeatured: boolean;
  skills: string[];
};

export async function listPublicDevelopers(options: {
  skillSlug?: string;
  level?: string;
  availableOnly?: boolean;
  take?: number;
} = {}): Promise<DeveloperCard[]> {
  const profiles = await db.developerProfile.findMany({
    where: {
      ...PUBLIC_PROFILE_FILTER,
      ...(options.level ? { level: options.level } : {}),
      ...(options.availableOnly
        ? { acceptingWork: true, availability: "AVAILABLE" }
        : {}),
      ...(options.skillSlug
        ? { skills: { some: { skill: { slug: options.skillSlug } } } }
        : {}),
    },
    orderBy: [
      { isFeatured: "desc" },
      { ratingAvg: "desc" },
      { completedProjects: "desc" },
    ],
    take: Math.min(options.take ?? 48, 100),
    select: {
      headline: true,
      location: true,
      level: true,
      ratingAvg: true,
      ratingCount: true,
      completedProjects: true,
      hourlyRate: true,
      acceptingWork: true,
      availability: true,
      isFeatured: true,
      user: { select: { username: true, name: true, avatarUrl: true } },
      skills: {
        take: 6,
        orderBy: { level: "desc" },
        select: { skill: { select: { name: true } } },
      },
    },
  });

  return profiles
    // Prisma filtri `username: { not: null }` bo'lsa ham TS uni `string | null`
    // deb biladi — shuning uchun aniq tekshirib o'tamiz.
    .filter((profile) => profile.user.username !== null)
    .map((profile) => ({
      username: profile.user.username as string,
      name: profile.user.name,
      avatarUrl: profile.user.avatarUrl,
      headline: profile.headline,
      location: profile.location,
      level: profile.level,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      completedProjects: profile.completedProjects,
      hourlyRate: profile.hourlyRate,
      isAvailable: profile.acceptingWork && profile.availability === "AVAILABLE",
      isFeatured: profile.isFeatured,
      skills: profile.skills.map((entry) => entry.skill.name),
    }));
}

/** Ommaviy profillar soni — bo'sh holatni aniqlash uchun. */
export async function countPublicDevelopers(): Promise<number> {
  return db.developerProfile.count({ where: PUBLIC_PROFILE_FILTER });
}

// ─────────────────────────────────────────────────────────────────────────────
// Profil
// ─────────────────────────────────────────────────────────────────────────────

export type DeveloperProfilePage = {
  username: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;

  level: string;
  xp: number;
  ratingAvg: number;
  ratingCount: number;
  successRate: number;
  completedProjects: number;
  yearsExperience: number;
  hourlyRate: Tiyin;
  avgResponseMinutes: number | null;
  avgDeliveryDays: number | null;
  isAvailable: boolean;

  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  telegramUsername: string | null;

  seoTitle: string | null;
  seoDescription: string | null;

  skills: Array<{ name: string; kind: string; level: number }>;
  languages: Array<{ code: string; proficiency: string }>;

  portfolio: Array<{
    id: string;
    title: string;
    description: string | null;
    coverUrl: string | null;
    url: string | null;
    year: number | null;
    tech: string[];
  }>;

  certificates: Array<{
    id: string;
    title: string;
    issuer: string | null;
    url: string | null;
    issuedAt: Date | null;
    verified: boolean;
  }>;

  badges: Array<{ slug: string; name: string; description: string; tier: string }>;

  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    reply: string | null;
    authorName: string;
    authorAvatar: string | null;
    projectTitle: string;
  }>;
};

/**
 * Ommaviy profilni oladi.
 *
 * Topilmasa yoki tasdiqlanmagan bo'lsa `null` — chaqiruvchi 404 ko'rsatadi.
 */
export async function getDeveloperProfile(
  username: string
): Promise<DeveloperProfilePage | null> {
  const profile = await db.developerProfile.findFirst({
    where: {
      ...PUBLIC_PROFILE_FILTER,
      user: { ...PUBLIC_PROFILE_FILTER.user, username },
    },
    select: {
      headline: true,
      bio: true,
      coverUrl: true,
      location: true,
      level: true,
      xp: true,
      ratingAvg: true,
      ratingCount: true,
      successRate: true,
      completedProjects: true,
      yearsExperience: true,
      hourlyRate: true,
      avgResponseMinutes: true,
      avgDeliveryDays: true,
      acceptingWork: true,
      availability: true,
      githubUrl: true,
      linkedinUrl: true,
      portfolioUrl: true,
      telegramUsername: true,
      seoTitle: true,
      seoDescription: true,

      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          badges: {
            select: {
              badge: {
                select: { slug: true, name: true, description: true, tier: true },
              },
            },
          },
          reviewsReceived: {
            where: { isPublic: true, isHidden: false },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              reply: true,
              author: { select: { name: true, avatarUrl: true } },
              project: { select: { title: true } },
            },
          },
        },
      },

      skills: {
        orderBy: { level: "desc" },
        select: {
          level: true,
          skill: { select: { name: true, kind: true } },
        },
      },

      languages: { select: { code: true, proficiency: true } },

      portfolio: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          coverUrl: true,
          url: true,
          year: true,
          techJson: true,
        },
      },

      certificates: {
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          title: true,
          issuer: true,
          url: true,
          issuedAt: true,
          verifiedAt: true,
        },
      },
    },
  });

  if (!profile?.user.username) return null;

  return {
    username: profile.user.username,
    name: profile.user.name,
    avatarUrl: profile.user.avatarUrl,
    coverUrl: profile.coverUrl,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,

    level: profile.level,
    xp: profile.xp,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    successRate: profile.successRate,
    completedProjects: profile.completedProjects,
    yearsExperience: profile.yearsExperience,
    hourlyRate: profile.hourlyRate,
    avgResponseMinutes: profile.avgResponseMinutes,
    avgDeliveryDays: profile.avgDeliveryDays,
    isAvailable: profile.acceptingWork && profile.availability === "AVAILABLE",

    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    portfolioUrl: profile.portfolioUrl,
    telegramUsername: profile.telegramUsername,

    seoTitle: profile.seoTitle,
    seoDescription: profile.seoDescription,

    skills: profile.skills.map((entry) => ({
      name: entry.skill.name,
      kind: entry.skill.kind,
      level: entry.level,
    })),

    languages: profile.languages,

    portfolio: profile.portfolio.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      coverUrl: item.coverUrl,
      url: item.url,
      year: item.year,
      // JSON maydon — buzuq bo'lsa bo'sh massiv, sahifa yiqilmaydi.
      tech: readStringList(item.techJson, `portfolio:${item.id}`),
    })),

    certificates: profile.certificates.map((certificate) => ({
      id: certificate.id,
      title: certificate.title,
      issuer: certificate.issuer,
      url: certificate.url,
      issuedAt: certificate.issuedAt,
      verified: certificate.verifiedAt !== null,
    })),

    badges: profile.user.badges.map((entry) => entry.badge),

    reviews: profile.user.reviewsReceived.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reply: review.reply,
      authorName: review.author.name,
      authorAvatar: review.author.avatarUrl,
      projectTitle: review.project.title,
    })),
  };
}

/**
 * Statik sahifalar uchun barcha ommaviy username'lar.
 *
 * `generateStaticParams` uchun: profillar oldindan yasalsa Google
 * ularni tezroq indekslaydi va sahifa bir zumda ochiladi.
 */
export async function listPublicUsernames(): Promise<string[]> {
  const profiles = await db.developerProfile.findMany({
    where: PUBLIC_PROFILE_FILTER,
    select: { user: { select: { username: true } } },
    take: 1000,
  });

  return profiles
    .map((profile) => profile.user.username)
    .filter((username): username is string => username !== null);
}
