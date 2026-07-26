import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { ProjectStatus, isAdminRole } from "@/lib/enums";
import type { DbClient } from "@/lib/db";

/**
 * LOYIHA CHATI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  KIM KIM BILAN GAPLASHADI
 *
 *  Chat LOYIHAGA bog'langan: mijoz va tayinlangan mutaxassis. Bu ataylab
 *  cheklov — "istalgan odamga yozish" imkoniyati spam va platformadan
 *  chetlab ketish (to'lovni chetlab o'tish) yo'lini ochadi.
 *
 *  Suhbat AVTOMATIK yaratiladi: taklif qabul qilingach ikkalasi ham
 *  gaplashishi kerak. Alohida "chat boshlash" tugmasi keraksiz qadam.
 *
 *  ADMIN har suhbatni o'qiy oladi — nizolarni hal qilish uchun. Lekin
 *  u yozganda bu KO'RINADI (`senderId` uning id'si), ya'ni yashirin
 *  aralashish yo'q.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class ChatError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "EMPTY_MESSAGE"
      | "PROJECT_NOT_READY"
  ) {
    super(message);
    this.name = "ChatError";
  }
}

export function chatErrorMessage(error: unknown): string {
  if (error instanceof ChatError) return error.message;
  return "Xabar yuborilmadi. Qayta urinib ko'ring.";
}

/** Bitta xabarning maksimal uzunligi. */
const MAX_MESSAGE_LENGTH = 4000;

/** Bir sahifada ko'rsatiladigan xabarlar soni. */
const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Suhbat yaratish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loyiha uchun suhbatni topadi yoki yaratadi.
 *
 * `tx` beriladi: bu funksiya taklif qabul qilish tranzaksiyasi ichidan
 * ham chaqiriladi — suhbat va tayinlash birga bajarilishi kerak.
 */
export async function ensureProjectConversation(
  client: DbClient,
  params: { projectId: string; customerId: string; developerId: string }
): Promise<{ id: string }> {
  const existing = await client.conversation.findUnique({
    where: { projectId: params.projectId },
    select: { id: true },
  });

  if (existing) {
    /**
     * Ishtirokchi qo'shilib qolmaganini tekshiramiz.
     *
     * Mutaxassis O'ZGARISHI mumkin (birinchisi ishni tashlab ketdi).
     * Bunday holatda suhbat bor, lekin yangi mutaxassis unda yo'q.
     */
    await client.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: existing.id,
          userId: params.developerId,
        },
      },
      update: {},
      create: { conversationId: existing.id, userId: params.developerId },
    });

    return existing;
  }

  return client.conversation.create({
    data: {
      kind: "PROJECT",
      projectId: params.projectId,
      participants: {
        create: [
          { userId: params.customerId },
          { userId: params.developerId },
        ],
      },
    },
    select: { id: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ro'yxat
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationSummary = {
  id: string;
  projectPublicId: string | null;
  projectTitle: string | null;
  projectStatus: string | null;
  /** Boshqa tomonning ismi */
  otherName: string;
  otherAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
};

/**
 * Foydalanuvchining suhbatlari.
 *
 * O'qilmagan xabarlar soni `lastReadAt` ga qarab hisoblanadi — bu
 * yondashuv har xabar uchun "o'qildi" yozuvi saqlashdan ancha arzon
 * va ikki kishilik suhbat uchun yetarli.
 */
export async function listConversations(
  userId: string
): Promise<ConversationSummary[]> {
  const rows = await db.conversationParticipant.findMany({
    where: { userId, leftAt: null },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 50,
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          project: {
            select: { publicId: true, title: true, status: true },
          },
          // Oxirgi xabar — ro'yxatda ko'rsatiladi.
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, kind: true },
          },
          participants: {
            where: { userId: { not: userId } },
            select: {
              user: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  /**
   * O'qilmaganlar soni — BITTA xom SQL so'rovi.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *  NEGA XOM SQL
   *
   *  Prisma'da bog'langan yozuvlarni har qatorning O'Z `lastReadAt` iga
   *  qarab sanash mumkin emas. ORM bilan yozilsa har suhbat uchun
   *  alohida `count` kerak bo'ladi — 50 suhbatda 50 so'rov (N+1).
   *
   *  Identifikatorlar QO'SHTIRNOQ ichida: SQLite va PostgreSQL
   *  ikkalasida ishlaydi, ya'ni Postgres'ga o'tishda tegilmaydi.
   * ═══════════════════════════════════════════════════════════════════════
   */
  const unreadRows = await db.$queryRaw<
    Array<{ conversationId: string; total: bigint | number }>
  >(Prisma.sql`
    SELECT p."conversationId" AS "conversationId", COUNT(m."id") AS total
    FROM "ConversationParticipant" AS p
    LEFT JOIN "Message" AS m
      ON m."conversationId" = p."conversationId"
      AND m."senderId" <> ${userId}
      AND m."deletedAt" IS NULL
      AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
    WHERE p."userId" = ${userId}
      AND p."leftAt" IS NULL
    GROUP BY p."conversationId"
  `);

  // SQLite'da COUNT `BigInt` qaytarishi mumkin.
  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, Number(row.total)])
  );

  return rows.map((row) => {
    const conversation = row.conversation;
    const other = conversation.participants[0]?.user;
    const last = conversation.messages[0];

    return {
      id: conversation.id,
      projectPublicId: conversation.project?.publicId ?? null,
      projectTitle: conversation.project?.title ?? null,
      projectStatus: conversation.project?.status ?? null,
      // Ishtirokchi o'chirilgan bo'lsa ham ro'yxat yiqilmasligi kerak.
      otherName: other?.name ?? "Foydalanuvchi",
      otherAvatarUrl: other?.avatarUrl ?? null,
      // Fayl xabarida `body` bo'sh bo'lishi mumkin.
      lastMessage: last?.body ?? (last ? "Fayl" : null),
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitta suhbat
// ─────────────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  body: string | null;
  kind: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  isMine: boolean;
  createdAt: Date;
  editedAt: Date | null;
};

export type ConversationDetail = {
  id: string;
  projectPublicId: string | null;
  projectTitle: string | null;
  otherName: string;
  otherAvatarUrl: string | null;
  messages: ChatMessage[];
  /** Yozish mumkinmi — tugagan loyihada chat yopiladi */
  canWrite: boolean;
};

/**
 * Suhbatni ochadi va `lastReadAt` ni yangilaydi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EGALIK: ishtirokchi bo'lmagan odam o'qiy olmaydi
 *
 *  `conversationId` — cuid, taxmin qilish qiyin, lekin IMKONSIZ emas
 *  (havola ulashilishi mumkin). Shu sababli har o'qishda ishtirokchilik
 *  tekshiriladi.
 *
 *  Admin istisno: u nizoni hal qilish uchun o'qiy oladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function openConversation(params: {
  conversationId: string;
  userId: string;
  userRole: string;
}): Promise<ConversationDetail> {
  const conversation = await db.conversation.findUnique({
    where: { id: params.conversationId },
    select: {
      id: true,
      project: {
        select: { publicId: true, title: true, status: true },
      },
      participants: {
        select: {
          userId: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: PAGE_SIZE,
        select: {
          id: true,
          body: true,
          kind: true,
          senderId: true,
          createdAt: true,
          editedAt: true,
          sender: { select: { name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!conversation) {
    throw new ChatError("Suhbat topilmadi", "NOT_FOUND");
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.userId === params.userId
  );

  if (!isParticipant && !isAdminRole(params.userRole)) {
    throw new ChatError("Bu suhbatga kirish huquqingiz yo'q", "FORBIDDEN");
  }

  // O'qilgan deb belgilaymiz — faqat haqiqiy ishtirokchi uchun.
  // Admin o'qishi "seen" holatini o'zgartirmasligi kerak.
  if (isParticipant) {
    await db.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: params.userId,
        },
      },
      data: { lastReadAt: new Date() },
    });
  }

  const other = conversation.participants.find(
    (participant) => participant.userId !== params.userId
  );

  /**
   * Tugagan yoki bekor qilingan loyihada yozish YOPILADI.
   *
   * Sababi: chat loyiha bilan bog'liq ish quroli. Tugagach uni ochiq
   * qoldirish "platformadan tashqari kelishish" kanaliga aylanadi.
   * Tarix esa o'qish uchun qoladi — nizoda kerak bo'ladi.
   */
  const closedStatuses: string[] = [
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ];

  const canWrite =
    isParticipant &&
    (conversation.project === null ||
      !closedStatuses.includes(conversation.project.status));

  return {
    id: conversation.id,
    projectPublicId: conversation.project?.publicId ?? null,
    projectTitle: conversation.project?.title ?? null,
    otherName: other?.user.name ?? "Foydalanuvchi",
    otherAvatarUrl: other?.user.avatarUrl ?? null,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      body: message.body,
      kind: message.kind,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatarUrl: message.sender.avatarUrl,
      isMine: message.senderId === params.userId,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
    })),
    canWrite,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Xabar yuborish
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<{ id: string }> {
  const body = params.body.trim();

  if (body === "") {
    throw new ChatError("Xabar bo'sh", "EMPTY_MESSAGE");
  }

  const conversation = await db.conversation.findUnique({
    where: { id: params.conversationId },
    select: {
      id: true,
      project: { select: { status: true } },
      participants: { select: { userId: true, leftAt: true } },
    },
  });

  if (!conversation) {
    throw new ChatError("Suhbat topilmadi", "NOT_FOUND");
  }

  // YOZISH uchun ishtirokchi bo'lish SHART — admin ham suhbatga
  // qo'shilmagan bo'lsa yozmaydi. Nizoda u alohida kanal orqali
  // ishlaydi.
  const participant = conversation.participants.find(
    (row) => row.userId === params.senderId && row.leftAt === null
  );

  if (!participant) {
    throw new ChatError("Bu suhbatga yozish huquqingiz yo'q", "FORBIDDEN");
  }

  const closedStatuses: string[] = [
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ];

  if (
    conversation.project &&
    closedStatuses.includes(conversation.project.status)
  ) {
    throw new ChatError(
      "Loyiha tugagan — bu suhbatda yozish yopilgan.",
      "PROJECT_NOT_READY"
    );
  }

  return db.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: params.senderId,
        // Uzun xabar KESILADI, rad etilmaydi: foydalanuvchi yozgan
        // matnni yo'qotish achinarli.
        body: body.slice(0, MAX_MESSAGE_LENGTH),
        kind: "TEXT",
      },
      select: { id: true },
    });

    /**
     * `lastMessageAt` YANGILANADI.
     *
     * Bu ro'yxatni tartiblash uchun kerak. Uni har o'qishda
     * `messages` dan hisoblash mumkin, lekin u ancha qimmat: har
     * suhbat uchun qo'shimcha so'rov.
     */
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Yuboruvchi o'z xabarini o'qigan hisoblanadi.
    await tx.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: params.senderId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return message;
  });
}

/**
 * Loyiha sahifasidan chatga o'tish uchun: suhbat id'sini topadi.
 *
 * Suhbat yo'q bo'lsa `null` — loyiha hali tayinlanmagan.
 */
export async function findProjectConversation(params: {
  projectId: string;
  userId: string;
  userRole: string;
}): Promise<string | null> {
  const conversation = await db.conversation.findUnique({
    where: { projectId: params.projectId },
    select: {
      id: true,
      participants: { select: { userId: true } },
    },
  });

  if (!conversation) return null;

  const allowed =
    conversation.participants.some((row) => row.userId === params.userId) ||
    isAdminRole(params.userRole);

  return allowed ? conversation.id : null;
}
