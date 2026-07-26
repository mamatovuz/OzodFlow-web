import { db } from "@/lib/db";
import {
  ACTIVE_PROJECT_STATUSES,
  ProjectStatus,
  ProposalStatus,
  UserRole,
  isAdminRole,
} from "@/lib/enums";
import type { Tiyin } from "@/lib/money";

/**
 * LOYIHA SO'ROVLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  RUXSAT SO'ROV DARAJASIDA
 *
 *  `getProjectDetail` loyihani FAQAT ko'rish huquqi bor odamga qaytaradi:
 *  mijoz, tayinlangan developer, taklif yuborgan developer yoki admin.
 *
 *  Bu tekshiruvni komponentga qoldirish xavfli: kimdir yangi sahifa
 *  yozganda tekshirishni unutadi va boshqaning loyihasi ochilib qoladi.
 *  So'rovning o'zi ruxsatsiz ma'lumot QAYTARMASA, unutish imkoni yo'q.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ro'yxat
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectSummary = {
  id: string;
  publicId: string;
  title: string;
  status: string;
  budgetMin: Tiyin;
  budgetMax: Tiyin;
  agreedAmount: Tiyin | null;
  deadlineAt: Date | null;
  createdAt: Date;
  categoryName: string;
  proposalCount: number;
  isUrgent: boolean;
  counterparty: { name: string; avatarUrl: string | null; username: string | null } | null;
};

/**
 * Foydalanuvchining loyihalari.
 *
 * Mijoz uchun — o'zi joylashtirgani, developer uchun — o'ziga
 * tayinlangani.
 */
export async function listMyProjects(params: {
  userId: string;
  role: string;
  status?: string;
  take?: number;
}): Promise<ProjectSummary[]> {
  const isDeveloper = params.role === UserRole.DEVELOPER;

  const statusFilter =
    params.status === "ACTIVE"
      ? { in: [...ACTIVE_PROJECT_STATUSES] }
      : params.status
        ? params.status
        : undefined;

  const rows = await db.project.findMany({
    where: {
      ...(isDeveloper
        ? { assignedDeveloperId: params.userId }
        : { customerId: params.userId }),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(params.take ?? 100, 100),
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
      isUrgent: true,
      category: { select: { name: true } },
      customer: { select: { name: true, avatarUrl: true, username: true } },
      developer: { select: { name: true, avatarUrl: true, username: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    title: row.title,
    status: row.status,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    agreedAmount: row.agreedAmount,
    deadlineAt: row.deadlineAt,
    createdAt: row.createdAt,
    categoryName: row.category.name,
    proposalCount: row.proposalCount,
    isUrgent: row.isUrgent,
    // Ro'yxatda "boshqa tomon" ko'rsatiladi: mijozga developer,
    // developerga mijoz.
    counterparty: isDeveloper ? row.customer : row.developer,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Ochiq loyihalar (developer uchun)
// ─────────────────────────────────────────────────────────────────────────────

export type OpenProjectItem = ProjectSummary & {
  description: string;
  alreadyProposed: boolean;
};

export async function listOpenProjects(params: {
  developerId: string;
  categoryId?: string;
}): Promise<OpenProjectItem[]> {
  const rows = await db.project.findMany({
    where: {
      status: ProjectStatus.OPEN,
      visibility: "PUBLIC",
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    },
    orderBy: [{ isUrgent: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      agreedAmount: true,
      deadlineAt: true,
      createdAt: true,
      proposalCount: true,
      isUrgent: true,
      category: { select: { name: true } },
      customer: { select: { name: true, avatarUrl: true, username: true } },
      // Shu developer allaqachon taklif yuborganmi — ro'yxatda darhol
      // ko'rinishi kerak, aks holda u bosib kirib, keyin bilib qoladi.
      proposals: {
        where: { developerId: params.developerId },
        select: { id: true },
        take: 1,
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    title: row.title,
    description: row.description,
    status: row.status,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    agreedAmount: row.agreedAmount,
    deadlineAt: row.deadlineAt,
    createdAt: row.createdAt,
    categoryName: row.category.name,
    proposalCount: row.proposalCount,
    isUrgent: row.isUrgent,
    counterparty: row.customer,
    alreadyProposed: row.proposals.length > 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Batafsil
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectDetail = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  requirements: string | null;
  status: string;
  budgetMin: Tiyin;
  budgetMax: Tiyin;
  agreedAmount: Tiyin | null;
  commissionBps: number;
  deadlineAt: Date | null;
  createdAt: Date;
  isUrgent: boolean;
  revisionCount: number;
  categoryName: string;

  customer: { id: string; name: string; avatarUrl: string | null };
  developer: { id: string; name: string; avatarUrl: string | null; username: string | null } | null;

  escrow: {
    status: string;
    amount: Tiyin;
    developerAmount: Tiyin;
    commissionAmount: Tiyin;
  } | null;

  proposals: Array<{
    id: string;
    amount: Tiyin;
    deliveryDays: number;
    coverLetter: string;
    status: string;
    createdAt: Date;
    developer: {
      id: string;
      name: string;
      avatarUrl: string | null;
      username: string | null;
      level: string | null;
      ratingAvg: number | null;
      ratingCount: number | null;
      completedProjects: number | null;
    };
  }>;

  events: Array<{
    id: string;
    type: string;
    message: string | null;
    createdAt: Date;
    actorName: string | null;
  }>;

  /** Ko'ruvchining bu loyihadagi roli — UI shunga qarab quriladi */
  viewerRole: "customer" | "developer" | "proposer" | "admin";

  /**
   * Ko'ruvchi taklif yubora oladimi.
   *
   * Uch shart birga: DEVELOPER roli, loyiha OCHIQ, va hali taklif
   * yubormagan. Bu yerda hisoblanadi, sahifada emas — sahifa faqat
   * chizadi, qaror qabul qilmaydi.
   */
  canPropose: boolean;

  /** Allaqachon taklif yuborganmi — "yuborilgan" xabarini ko'rsatish uchun */
  hasProposed: boolean;
};

/**
 * Loyihani ko'rish huquqi bilan birga oladi.
 *
 * Huquqi bo'lmasa `null` qaytadi — chaqiruvchi 404 ko'rsatadi.
 * "403" emas, ataylab: begona loyiha MAVJUDLIGINI ham bilish shart emas.
 */
export async function getProjectDetail(params: {
  publicId: string;
  viewerId: string;
  viewerRole: string;
}): Promise<ProjectDetail | null> {
  const project = await db.project.findUnique({
    where: { publicId: params.publicId },
    select: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      requirements: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      agreedAmount: true,
      commissionBps: true,
      deadlineAt: true,
      createdAt: true,
      isUrgent: true,
      revisionCount: true,
      customerId: true,
      assignedDeveloperId: true,
      category: { select: { name: true } },
      customer: { select: { id: true, name: true, avatarUrl: true } },
      developer: {
        select: { id: true, name: true, avatarUrl: true, username: true },
      },
      escrow: {
        select: {
          status: true,
          amount: true,
          developerAmount: true,
          commissionAmount: true,
        },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          deliveryDays: true,
          coverLetter: true,
          status: true,
          createdAt: true,
          developer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              username: true,
              developerProfile: {
                select: {
                  level: true,
                  ratingAvg: true,
                  ratingCount: true,
                  completedProjects: true,
                },
              },
            },
          },
        },
      },
      events: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  });

  if (!project) return null;

  // ── Ruxsat ──────────────────────────────────────────────────────────────
  const isCustomer = project.customerId === params.viewerId;
  const isDeveloper = project.assignedDeveloperId === params.viewerId;
  const isAdmin = isAdminRole(params.viewerRole);
  const isProposer = project.proposals.some(
    (proposal) => proposal.developer.id === params.viewerId
  );

  // Ochiq loyihani har qanday developer ko'ra oladi — taklif yuborish
  // uchun avval o'qishi kerak.
  const canViewOpen =
    project.status === ProjectStatus.OPEN && params.viewerRole === UserRole.DEVELOPER;

  if (!isCustomer && !isDeveloper && !isAdmin && !isProposer && !canViewOpen) {
    return null;
  }

  const viewerRole: ProjectDetail["viewerRole"] = isCustomer
    ? "customer"
    : isDeveloper
      ? "developer"
      : isAdmin
        ? "admin"
        : "proposer";

  /**
   * Takliflar KIMGA ko'rinadi:
   *   • mijoz va admin — hammasini ko'radi (tanlash uchun)
   *   • developer — FAQAT o'zinikini
   *
   * Aks holda raqiblarning narxi ko'rinib qolardi va bu bozorni buzadi.
   */
  const visibleProposals =
    isCustomer || isAdmin
      ? project.proposals
      : project.proposals.filter(
          (proposal) => proposal.developer.id === params.viewerId
        );

  return {
    id: project.id,
    publicId: project.publicId,
    title: project.title,
    description: project.description,
    requirements: project.requirements,
    status: project.status,
    budgetMin: project.budgetMin,
    budgetMax: project.budgetMax,
    agreedAmount: project.agreedAmount,
    commissionBps: project.commissionBps,
    deadlineAt: project.deadlineAt,
    createdAt: project.createdAt,
    isUrgent: project.isUrgent,
    revisionCount: project.revisionCount,
    categoryName: project.category.name,
    customer: project.customer,
    developer: project.developer,
    escrow: project.escrow,
    proposals: visibleProposals.map((proposal) => ({
      id: proposal.id,
      amount: proposal.amount,
      deliveryDays: proposal.deliveryDays,
      coverLetter: proposal.coverLetter,
      status: proposal.status,
      createdAt: proposal.createdAt,
      developer: {
        id: proposal.developer.id,
        name: proposal.developer.name,
        avatarUrl: proposal.developer.avatarUrl,
        username: proposal.developer.username,
        level: proposal.developer.developerProfile?.level ?? null,
        ratingAvg: proposal.developer.developerProfile?.ratingAvg ?? null,
        ratingCount: proposal.developer.developerProfile?.ratingCount ?? null,
        completedProjects:
          proposal.developer.developerProfile?.completedProjects ?? null,
      },
    })),
    events: project.events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt,
      actorName: event.actor?.name ?? null,
    })),
    viewerRole,
    canPropose:
      params.viewerRole === UserRole.DEVELOPER &&
      project.status === ProjectStatus.OPEN &&
      !isProposer &&
      // O'z loyihasiga taklif yuborib bo'lmaydi (developer ham mijoz
      // bo'lishi mumkin).
      project.customerId !== params.viewerId,
    hasProposed: isProposer,
  };
}

/** Developer taklif yuborganmi — taklif formasini ko'rsatish uchun. */
export async function hasProposed(
  projectId: string,
  developerId: string
): Promise<boolean> {
  const proposal = await db.proposal.findUnique({
    where: { projectId_developerId: { projectId, developerId } },
    select: { id: true },
  });

  return proposal !== null;
}

/** Developer yuborgan takliflar ro'yxati. */
export async function listMyProposals(developerId: string) {
  return db.proposal.findMany({
    where: { developerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      deliveryDays: true,
      status: true,
      createdAt: true,
      respondedAt: true,
      project: {
        select: {
          publicId: true,
          title: true,
          status: true,
          budgetMin: true,
          budgetMax: true,
          category: { select: { name: true } },
        },
      },
    },
  });
}

/** Kutilayotgan takliflar soni — mijozga ogohlantirish uchun. */
export async function countPendingProposals(projectId: string): Promise<number> {
  return db.proposal.count({
    where: { projectId, status: ProposalStatus.PENDING },
  });
}
