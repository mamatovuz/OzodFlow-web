import { Prisma } from "@prisma/client";

import type { NavBadgeCounts } from "@/components/app/app-sidebar";
import { db } from "@/lib/db";
import { ACTIVE_PROJECT_STATUSES, ProposalStatus, UserRole } from "@/lib/enums";

/**
 * Yon paneldagi raqamlar (o'qilmagan xabarlar, faol loyihalar, kutilayotgan
 * takliflar).
 *
 * Bu so'rovlar HAR SAHIFADA bajariladi — qobiq layout'da turadi. Shu sababli
 * ular arzon bo'lishi shart: faqat `COUNT`, hech qanday `include` yo'q.
 */

/**
 * O'qilmagan xabarlar soni.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA XOM SQL
 *
 *  Prisma ORM'ida bu so'rovni yozish uchun avval foydalanuvchining barcha
 *  suhbatlarini va ularning `lastReadAt` qiymatlarini olib, keyin har biri
 *  uchun alohida `count` qilish kerak bo'ladi — bu klassik N+1 muammosi.
 *  50 suhbati bor foydalanuvchida har sahifa uchun 51 ta so'rov.
 *
 *  Xom SQL bilan bitta so'rov kifoya.
 *
 *  Identifikatorlar QO'SHTIRNOQ ichida: bu SQLite va PostgreSQL ikkalasida
 *  ham ishlaydi, ya'ni Postgres'ga o'tishda o'zgartirish kerak bo'lmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function countUnreadMessages(userId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM "Message" AS m
    JOIN "ConversationParticipant" AS p
      ON p."conversationId" = m."conversationId"
    WHERE p."userId" = ${userId}
      AND p."leftAt" IS NULL
      AND m."senderId" <> ${userId}
      AND m."deletedAt" IS NULL
      AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
  `);

  // SQLite'da COUNT `BigInt` qaytarishi mumkin — `Number` ga o'giramiz.
  return Number(rows[0]?.total ?? 0);
}

export async function getNavBadges(user: {
  id: string;
  role: string;
}): Promise<NavBadgeCounts> {
  try {
    const isDeveloper = user.role === UserRole.DEVELOPER;

    const [unreadMessages, activeProjects, pendingProposals] = await Promise.all([
      countUnreadMessages(user.id),

      db.project.count({
        where: {
          status: { in: [...ACTIVE_PROJECT_STATUSES] },
          ...(isDeveloper
            ? { assignedDeveloperId: user.id }
            : { customerId: user.id }),
        },
      }),

      // Taklif hisobi faqat developerga tegishli.
      isDeveloper
        ? db.proposal.count({
            where: { developerId: user.id, status: ProposalStatus.PENDING },
          })
        : Promise.resolve(0),
    ]);

    return { unreadMessages, activeProjects, pendingProposals };
  } catch (error) {
    // Raqamlar ko'rsatilmasligi — kabinetni ochmaslikdan yaxshi.
    console.error("[nav-badges] Hisoblash bajarilmadi:", error);
    return {};
  }
}
