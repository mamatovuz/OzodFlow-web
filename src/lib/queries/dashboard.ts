import { db } from "@/lib/db";
import {
  ACTIVE_PROJECT_STATUSES,
  ProjectStatus,
  ProposalStatus,
} from "@/lib/enums";

/**
 * KABINET MA'LUMOTLARI
 *
 * Mijoz va developer uchun alohida funksiyalar: ularning ko'rsatkichlari
 * umuman boshqa. Bitta "universal" funksiya yozib, keyin rolga qarab
 * yarmini tashlab yuborish — keraksiz so'rovlar demak.
 *
 * Pul maydonlari `bigint` (tiyin) sifatida qaytadi. Formatlash KOMPONENTDA
 * bajariladi — bu qatlam faqat ma'lumot beradi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mijoz
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerDashboard = {
  balance: bigint;
  lockedBalance: bigint;
  totalSpent: bigint;
  activeProjects: number;
  completedProjects: number;
  draftProjects: number;
  /** Ko'rib chiqilishi kerak bo'lgan takliflar */
  proposalsToReview: number;
  recentProjects: RecentProject[];
};

export type RecentProject = {
  id: string;
  publicId: string;
  title: string;
  status: string;
  budgetMin: bigint;
  budgetMax: bigint;
  agreedAmount: bigint | null;
  deadlineAt: Date | null;
  createdAt: Date;
  categoryName: string;
  proposalCount: number;
  developer: { name: string; avatarUrl: string | null; username: string | null } | null;
};

export async function getCustomerDashboard(userId: string): Promise<CustomerDashboard> {
  const [wallet, profile, counts, proposalsToReview, recentProjects] =
    await Promise.all([
      db.wallet.findUnique({
        where: { userId },
        select: { balance: true, lockedBalance: true },
      }),

      db.customerProfile.findUnique({
        where: { userId },
        select: { totalSpent: true },
      }),

      db.project.groupBy({
        by: ["status"],
        where: { customerId: userId },
        _count: { _all: true },
      }),

      // Faqat OCHIQ loyihalardagi kutilayotgan takliflar — yopilgan
      // loyihaning takliflari mijozdan harakat talab qilmaydi.
      db.proposal.count({
        where: {
          status: ProposalStatus.PENDING,
          project: { customerId: userId, status: ProjectStatus.OPEN },
        },
      }),

      db.project.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          publicId: true,
          title: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
          agreedAmount: true,
          deadlineAt: true,
          createdAt: true,
          proposalCount: true,
          category: { select: { name: true } },
          developer: {
            select: { name: true, avatarUrl: true, username: true },
          },
        },
      }),
    ]);

  /** `groupBy` natijasini holat → son xaritasiga aylantiradi. */
  const byStatus = new Map(counts.map((row) => [row.status, row._count._all]));
  const sumOf = (statuses: readonly string[]) =>
    statuses.reduce((total, status) => total + (byStatus.get(status) ?? 0), 0);

  return {
    balance: wallet?.balance ?? 0n,
    lockedBalance: wallet?.lockedBalance ?? 0n,
    totalSpent: profile?.totalSpent ?? 0n,
    activeProjects: sumOf(ACTIVE_PROJECT_STATUSES),
    completedProjects: byStatus.get(ProjectStatus.COMPLETED) ?? 0,
    draftProjects: byStatus.get(ProjectStatus.DRAFT) ?? 0,
    proposalsToReview,
    recentProjects: recentProjects.map((project) => ({
      id: project.id,
      publicId: project.publicId,
      title: project.title,
      status: project.status,
      budgetMin: project.budgetMin,
      budgetMax: project.budgetMax,
      agreedAmount: project.agreedAmount,
      deadlineAt: project.deadlineAt,
      createdAt: project.createdAt,
      categoryName: project.category.name,
      proposalCount: project.proposalCount,
      developer: project.developer,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer
// ─────────────────────────────────────────────────────────────────────────────

export type DeveloperDashboard = {
  balance: bigint;
  totalEarned: bigint;
  /** Escrow'da turgan, ish tugagach keladigan summa */
  pendingEarnings: bigint;
  level: string;
  xp: number;
  ratingAvg: number;
  ratingCount: number;
  successRate: number;
  completedProjects: number;
  activeWork: number;
  pendingProposals: number;
  /** Taklif yuborish mumkin bo'lgan ochiq loyihalar */
  availableProjects: number;
  verified: boolean;
  recentWork: RecentProject[];
};

export async function getDeveloperDashboard(
  userId: string
): Promise<DeveloperDashboard> {
  const [wallet, profile, activeWork, pendingProposals, availableProjects, escrows, recentWork] =
    await Promise.all([
      db.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      }),

      db.developerProfile.findUnique({
        where: { userId },
        select: {
          level: true,
          xp: true,
          ratingAvg: true,
          ratingCount: true,
          successRate: true,
          completedProjects: true,
          totalEarned: true,
          verifiedAt: true,
        },
      }),

      db.project.count({
        where: {
          assignedDeveloperId: userId,
          status: { in: [...ACTIVE_PROJECT_STATUSES] },
        },
      }),

      db.proposal.count({
        where: { developerId: userId, status: ProposalStatus.PENDING },
      }),

      // Ochiq loyihalar — hali taklif yubormaganlari.
      db.project.count({
        where: {
          status: ProjectStatus.OPEN,
          visibility: "PUBLIC",
          proposals: { none: { developerId: userId } },
        },
      }),

      // Escrow'da bloklangan, ya'ni ish tugagach keladigan summa.
      db.escrow.aggregate({
        where: { developerId: userId, status: "FUNDED" },
        _sum: { developerAmount: true },
      }),

      db.project.findMany({
        where: { assignedDeveloperId: userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          publicId: true,
          title: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
          agreedAmount: true,
          deadlineAt: true,
          createdAt: true,
          proposalCount: true,
          category: { select: { name: true } },
          customer: { select: { name: true, avatarUrl: true, username: true } },
        },
      }),
    ]);

  return {
    balance: wallet?.balance ?? 0n,
    totalEarned: profile?.totalEarned ?? 0n,
    pendingEarnings: escrows._sum.developerAmount ?? 0n,
    level: profile?.level ?? "BEGINNER",
    xp: profile?.xp ?? 0,
    ratingAvg: profile?.ratingAvg ?? 0,
    ratingCount: profile?.ratingCount ?? 0,
    successRate: profile?.successRate ?? 0,
    completedProjects: profile?.completedProjects ?? 0,
    activeWork,
    pendingProposals,
    availableProjects,
    verified: profile?.verifiedAt !== null && profile?.verifiedAt !== undefined,
    recentWork: recentWork.map((project) => ({
      id: project.id,
      publicId: project.publicId,
      title: project.title,
      status: project.status,
      budgetMin: project.budgetMin,
      budgetMax: project.budgetMax,
      agreedAmount: project.agreedAmount,
      deadlineAt: project.deadlineAt,
      createdAt: project.createdAt,
      categoryName: project.category.name,
      proposalCount: project.proposalCount,
      // Developer ko'rinishida "boshqa tomon" — mijoz.
      developer: project.customer,
    })),
  };
}
