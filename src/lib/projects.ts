import { AUDIT, writeAudit } from "@/lib/audit";
import { ensureProjectConversation } from "@/lib/chat";
import { db, type DbClient } from "@/lib/db";
import {
  ProjectEventType,
  ProjectStatus,
  ProposalStatus,
  canTransition,
} from "@/lib/enums";
import { releaseEscrow } from "@/lib/escrow";
import type { Tiyin } from "@/lib/money";
import {
  getCommissionBps,
  getFreeRevisionCount,
  getMaxProposals,
  isProjectModerationEnabled,
} from "@/lib/settings";
import { generatePublicId, slugify } from "@/lib/utils";

/**
 * LOYIHA HAYOTIY DAVRI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  BUZILMAS QOIDALAR
 *
 *  1. Har bir amal EGALIKNI tekshiradi. "Loyiha id'si berilgan bo'lsa
 *     demak huquqi bor" degan taxmin QILINMAYDI — id URL'dan keladi va
 *     uni istalgan odam o'zgartirishi mumkin.
 *
 *  2. Holat o'tishlari `PROJECT_TRANSITIONS` jadvalidan tekshiriladi.
 *     Qo'lda `if (status === "X")` yozilsa, vaqt o'tib qoidalar bir-biriga
 *     zid bo'lib qoladi.
 *
 *  3. Komissiya loyiha yaratilganda MUZLATILADI (`commissionBps`).
 *     Admin foizni keyin o'zgartirsa, boshlangan loyihalarning
 *     matematikasi buzilmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class ProjectError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE"
      | "LIMIT_REACHED"
      | "DUPLICATE"
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yaratish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Takrorlanmaydigan `publicId` yasaydi.
 *
 * Tasodifiy kod nazariy jihatdan takrorlanishi mumkin (32^6 variant),
 * shuning uchun bazadan tekshiramiz. Bir necha urinishdan keyin ham
 * topilmasa — bu kutilmagan holat, xato tashlaymiz.
 */
async function generateUniquePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generatePublicId();

    const exists = await db.project.findUnique({
      where: { publicId: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
  }

  throw new Error("Loyiha uchun takrorlanmas kod yasab bo'lmadi");
}

export type CreateProjectData = {
  title: string;
  categoryId: string;
  serviceId?: string;
  description: string;
  requirements?: string;
  budgetMin: Tiyin;
  budgetMax: Tiyin;
  deadlineAt: Date;
  isUrgent: boolean;
};

/**
 * Yangi loyiha yaratadi.
 *
 * Moderatsiya yoqilgan bo'lsa loyiha PENDING_REVIEW holatida turadi va
 * admin tasdig'idan keyin ochiladi. Bu spam va firibgarlikdan himoya.
 */
export async function createProject(params: {
  customerId: string;
  data: CreateProjectData;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ id: string; publicId: string; status: string }> {
  const [publicId, commissionBps, moderate] = await Promise.all([
    generateUniquePublicId(),
    getCommissionBps(),
    isProjectModerationEnabled(),
  ]);

  const status = moderate ? ProjectStatus.PENDING_REVIEW : ProjectStatus.OPEN;

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        publicId,
        slug: slugify(params.data.title) || publicId.toLowerCase(),
        customerId: params.customerId,
        categoryId: params.data.categoryId,
        serviceId: params.data.serviceId ?? null,
        title: params.data.title,
        description: params.data.description,
        requirements: params.data.requirements ?? null,
        budgetMin: params.data.budgetMin,
        budgetMax: params.data.budgetMax,
        deadlineAt: params.data.deadlineAt,
        isUrgent: params.data.isUrgent,
        // Muzlatilgan komissiya — keyin o'zgarmaydi.
        commissionBps,
        status,
        publishedAt: status === ProjectStatus.OPEN ? new Date() : null,
      },
      select: { id: true, publicId: true, status: true },
    });

    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        actorId: params.customerId,
        type: ProjectEventType.CREATED,
        message: "Loyiha yaratildi",
      },
    });

    await tx.customerProfile.updateMany({
      where: { userId: params.customerId },
      data: { projectsPosted: { increment: 1 } },
    });

    await writeAudit(
      {
        actorId: params.customerId,
        action: AUDIT.PROJECT_CREATED,
        entityType: "Project",
        entityId: project.id,
        after: {
          publicId: project.publicId,
          status,
          budgetMin: params.data.budgetMin,
          budgetMax: params.data.budgetMax,
          commissionBps,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return project;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Takliflar
// ─────────────────────────────────────────────────────────────────────────────

export async function submitProposal(params: {
  developerId: string;
  projectId: string;
  coverLetter: string;
  amount: Tiyin;
  deliveryDays: number;
}): Promise<{ id: string }> {
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    select: {
      id: true,
      status: true,
      customerId: true,
      proposalCount: true,
      visibility: true,
    },
  });

  if (!project) {
    throw new ProjectError("Loyiha topilmadi", "NOT_FOUND");
  }

  if (project.status !== ProjectStatus.OPEN) {
    throw new ProjectError(
      "Bu loyiha taklif qabul qilmayapti",
      "INVALID_STATE"
    );
  }

  // O'z loyihasiga taklif yuborib bo'lmaydi.
  if (project.customerId === params.developerId) {
    throw new ProjectError("O'z loyihangizga taklif yubora olmaysiz", "FORBIDDEN");
  }

  const maxProposals = await getMaxProposals();
  if (project.proposalCount >= maxProposals) {
    throw new ProjectError(
      `Bu loyiha maksimal taklif soniga yetdi (${maxProposals})`,
      "LIMIT_REACHED"
    );
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.proposal.findUnique({
      where: {
        projectId_developerId: {
          projectId: params.projectId,
          developerId: params.developerId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ProjectError("Siz bu loyihaga allaqachon taklif yuborgansiz", "DUPLICATE");
    }

    const proposal = await tx.proposal.create({
      data: {
        projectId: params.projectId,
        developerId: params.developerId,
        coverLetter: params.coverLetter,
        amount: params.amount,
        deliveryDays: params.deliveryDays,
        status: ProposalStatus.PENDING,
      },
      select: { id: true },
    });

    await tx.project.update({
      where: { id: params.projectId },
      data: { proposalCount: { increment: 1 } },
    });

    await tx.projectEvent.create({
      data: {
        projectId: params.projectId,
        actorId: params.developerId,
        type: ProjectEventType.PROPOSAL_RECEIVED,
        message: "Yangi taklif keldi",
      },
    });

    return proposal;
  });
}

/**
 * Taklifni qabul qiladi: developer tayinlanadi va summa kelishiladi.
 *
 * DIQQAT: loyiha bu bosqichda HALI IN_PROGRESS bo'lmaydi. Ish escrow
 * to'ldirilgandan keyin boshlanadi — developer pul bloklanganini
 * ko'rmaguncha ishga kirishmasligi kerak.
 */
export async function acceptProposal(params: {
  customerId: string;
  proposalId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ projectId: string; developerId: string; amount: Tiyin }> {
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({
      where: { id: params.proposalId },
      select: {
        id: true,
        amount: true,
        deliveryDays: true,
        developerId: true,
        status: true,
        project: {
          select: { id: true, customerId: true, status: true, publicId: true },
        },
      },
    });

    if (!proposal) {
      throw new ProjectError("Taklif topilmadi", "NOT_FOUND");
    }

    // EGALIK TEKSHIRUVI — faqat loyiha egasi taklifni qabul qila oladi.
    if (proposal.project.customerId !== params.customerId) {
      throw new ProjectError("Bu loyiha sizga tegishli emas", "FORBIDDEN");
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new ProjectError("Taklif allaqachon ko'rib chiqilgan", "INVALID_STATE");
    }

    if (proposal.project.status !== ProjectStatus.OPEN) {
      throw new ProjectError("Loyiha ochiq emas", "INVALID_STATE");
    }

    // Tanlangan taklif qabul qilinadi.
    await tx.proposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.ACCEPTED, respondedAt: new Date() },
    });

    // Qolganlari rad etiladi — ular endi ma'nosiz va developerlar
    // javobsiz kutib qolmasligi kerak.
    await tx.proposal.updateMany({
      where: {
        projectId: proposal.project.id,
        id: { not: proposal.id },
        status: ProposalStatus.PENDING,
      },
      data: { status: ProposalStatus.REJECTED, respondedAt: new Date() },
    });

    await tx.project.update({
      where: { id: proposal.project.id },
      data: {
        assignedDeveloperId: proposal.developerId,
        agreedAmount: proposal.amount,
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: proposal.project.id,
        actorId: params.customerId,
        type: ProjectEventType.DEVELOPER_ASSIGNED,
        message: "Mutaxassis tanlandi. To'lov kutilmoqda.",
      },
    });

    /**
     * Suhbat SHU YERDA yaratiladi — tranzaksiya ichida.
     *
     * Nega bu yerda: mijoz va mutaxassis tayinlanish bilanoq
     * gaplashishi kerak. Alohida "chat boshlash" tugmasi keraksiz
     * qadam bo'lardi.
     *
     * Nega tranzaksiya ichida: tayinlash bajarilib suhbat
     * yaratilmasa, ikkalasi bir-biriga yozolmasdi va buni tuzatish
     * uchun qo'l aralashuvi kerak bo'lardi.
     */
    await ensureProjectConversation(tx, {
      projectId: proposal.project.id,
      customerId: params.customerId,
      developerId: proposal.developerId,
    });

    await writeAudit(
      {
        actorId: params.customerId,
        action: AUDIT.PROJECT_ASSIGNED,
        entityType: "Project",
        entityId: proposal.project.id,
        after: {
          developerId: proposal.developerId,
          agreedAmount: proposal.amount,
          deliveryDays: proposal.deliveryDays,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return {
      projectId: proposal.project.id,
      developerId: proposal.developerId,
      amount: proposal.amount,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ish jarayoni
// ─────────────────────────────────────────────────────────────────────────────

/** Developer ishni topshiradi. */
export async function markDelivered(params: {
  developerId: string;
  projectId: string;
  message: string;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const project = await requireProject(tx, params.projectId);

    if (project.assignedDeveloperId !== params.developerId) {
      throw new ProjectError("Bu loyiha sizga tayinlanmagan", "FORBIDDEN");
    }

    assertTransition(project.status, ProjectStatus.DELIVERED);

    await tx.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.DELIVERED, deliveredAt: new Date() },
    });

    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        actorId: params.developerId,
        type: ProjectEventType.DELIVERED,
        message: params.message,
      },
    });
  });
}

/** Mijoz tuzatish so'raydi. */
export async function requestRevision(params: {
  customerId: string;
  projectId: string;
  reason: string;
}): Promise<{ revisionCount: number; freeRevisions: number }> {
  const freeRevisions = await getFreeRevisionCount();

  return db.$transaction(async (tx) => {
    const project = await requireProject(tx, params.projectId);

    if (project.customerId !== params.customerId) {
      throw new ProjectError("Bu loyiha sizga tegishli emas", "FORBIDDEN");
    }

    assertTransition(project.status, ProjectStatus.IN_REVISION);

    const updated = await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.IN_REVISION,
        revisionCount: { increment: 1 },
      },
      select: { revisionCount: true },
    });

    await tx.revision.create({
      data: {
        projectId: project.id,
        requestedById: params.customerId,
        reason: params.reason,
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        actorId: params.customerId,
        type: ProjectEventType.REVISION_REQUESTED,
        message: params.reason,
      },
    });

    return { revisionCount: updated.revisionCount, freeRevisions };
  });
}

/**
 * Mijoz ishni qabul qiladi — pul taqsimlanadi.
 *
 * Escrow amali `releaseEscrow` da, alohida tranzaksiyada bajariladi.
 * Bu yerda faqat huquq tekshiriladi: pul mantig'i bitta joyda turishi
 * kerak va u `escrow.ts`.
 */
export async function approveProject(params: {
  customerId: string;
  projectId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ developerAmount: Tiyin; commissionAmount: Tiyin }> {
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, customerId: true, status: true },
  });

  if (!project) {
    throw new ProjectError("Loyiha topilmadi", "NOT_FOUND");
  }

  if (project.customerId !== params.customerId) {
    throw new ProjectError("Bu loyiha sizga tegishli emas", "FORBIDDEN");
  }

  assertTransition(project.status, ProjectStatus.COMPLETED);

  const result = await releaseEscrow({
    projectId: project.id,
    actorId: params.customerId,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return {
    developerAmount: result.developerAmount,
    commissionAmount: result.commissionAmount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Moderatsiya (admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loyihani tekshiruvdan o'tkazadi.
 *
 * Tasdiqlansa OPEN bo'ladi va mutaxassislarga ko'rinadi, rad etilsa
 * CANCELLED. Rad etish sababi mijozga ko'rinadi — u nimani tuzatish
 * kerakligini bilishi kerak.
 */
export async function moderateProject(params: {
  projectId: string;
  adminId: string;
  approve: boolean;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const project = await requireProject(tx, params.projectId);

    if (project.status !== ProjectStatus.PENDING_REVIEW) {
      throw new ProjectError(
        "Bu loyiha tekshiruvni kutmayapti",
        "INVALID_STATE"
      );
    }

    const nextStatus = params.approve
      ? ProjectStatus.OPEN
      : ProjectStatus.CANCELLED;

    assertTransition(project.status, nextStatus);

    await tx.project.update({
      where: { id: project.id },
      data: {
        status: nextStatus,
        ...(params.approve
          ? { publishedAt: new Date() }
          : { cancelledAt: new Date(), cancelReason: params.reason ?? null }),
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        actorId: params.adminId,
        type: params.approve
          ? ProjectEventType.PUBLISHED
          : ProjectEventType.CANCELLED,
        message: params.approve
          ? "Loyiha tekshiruvdan o'tdi va ochiq ro'yxatga chiqdi"
          : `Loyiha rad etildi: ${params.reason ?? "sabab ko'rsatilmagan"}`,
      },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.PROJECT_STATUS_CHANGED,
        entityType: "Project",
        entityId: project.id,
        before: { status: ProjectStatus.PENDING_REVIEW },
        after: { status: nextStatus, reason: params.reason ?? null },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

async function requireProject(tx: DbClient, projectId: string) {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      customerId: true,
      assignedDeveloperId: true,
      publicId: true,
    },
  });

  if (!project) {
    throw new ProjectError("Loyiha topilmadi", "NOT_FOUND");
  }

  return project;
}

/**
 * Holat o'tishini tekshiradi.
 *
 * Qoidalar `PROJECT_TRANSITIONS` jadvalida — bitta joyda. Har amalda
 * qo'lda `if` yozilsa, ular vaqt o'tib bir-biriga zid bo'lib qoladi.
 */
function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new ProjectError(
      `Loyihani "${from}" holatidan "${to}" holatiga o'tkazib bo'lmaydi`,
      "INVALID_STATE"
    );
  }
}

/** Xatoni foydalanuvchiga ko'rsatiladigan xabarga aylantiradi. */
export function projectErrorMessage(error: unknown): string {
  if (error instanceof ProjectError) return error.message;
  return "Kutilmagan xatolik. Qayta urinib ko'ring.";
}
