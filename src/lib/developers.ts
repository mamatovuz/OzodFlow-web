import { AUDIT, writeAudit } from "@/lib/audit";
import { db, type DbClient } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import { slugify } from "@/lib/utils";

/**
 * MUTAXASSISLARNI TASDIQLASH
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  HOZIRGI HOLAT — ochiq aytilgan
 *
 *  To'liq ariza oqimi (texnik test, portfolio yuklash, shaxsni tasdiqlash)
 *  HALI YOZILMAGAN. Hozircha tasdiqlashni admin qo'lda bajaradi: u
 *  mutaxassis bilan bog'lanadi, portfolio va tajribasini ko'radi, keyin
 *  admin panelda tasdiqlaydi.
 *
 *  Bu vaqtinchalik chora emas — kichik platformada boshlanish uchun
 *  ishlaydigan usul. Ariza oqimi qo'shilganda `verifyDeveloper` o'sha
 *  oqimdan chaqiriladi, mantiq o'zgarmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class DeveloperError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "NOT_DEVELOPER" | "ALREADY_VERIFIED"
  ) {
    super(message);
    this.name = "DeveloperError";
  }
}

/**
 * Ismdan takrorlanmas username yasaydi.
 *
 * Username ommaviy profil manzilining bir qismi (`/dev/username`),
 * shuning uchun u barqaror va o'qiladigan bo'lishi kerak.
 * Band bo'lsa oxiriga raqam qo'shiladi.
 */
async function generateUsername(tx: DbClient, name: string): Promise<string> {
  const base = slugify(name).slice(0, 30) || "mutaxassis";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;

    const taken = await tx.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!taken) return candidate;
  }

  // 100 ta variant band — bu deyarli imkonsiz, lekin jimgina
  // noto'g'ri qiymat qaytarishdan ko'ra xato tashlagan yaxshi.
  throw new Error(`"${base}" uchun bo'sh username topilmadi`);
}

/**
 * Mutaxassisni tasdiqlaydi: ommaviy profil ochiladi va u loyihalarga
 * taklif yubora oladi.
 */
export async function verifyDeveloper(params: {
  userId: string;
  adminId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ username: string }> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        role: true,
        username: true,
        developerProfile: { select: { id: true, verifiedAt: true } },
      },
    });

    if (!user) {
      throw new DeveloperError("Foydalanuvchi topilmadi", "NOT_FOUND");
    }

    if (user.role !== UserRole.DEVELOPER) {
      throw new DeveloperError(
        "Bu foydalanuvchi mutaxassis emas",
        "NOT_DEVELOPER"
      );
    }

    if (user.developerProfile?.verifiedAt) {
      throw new DeveloperError("Allaqachon tasdiqlangan", "ALREADY_VERIFIED");
    }

    // Ommaviy profil manzili uchun username shart.
    const username = user.username ?? (await generateUsername(tx, user.name));

    if (!user.username) {
      await tx.user.update({
        where: { id: user.id },
        data: { username },
      });
    }

    // Profil bo'lmasa yaratamiz — eski hisoblarda bo'lmasligi mumkin.
    await tx.developerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, verifiedAt: new Date() },
      update: { verifiedAt: new Date() },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.APPLICATION_APPROVED,
        entityType: "User",
        entityId: user.id,
        after: { verified: true, username },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );

    return { username };
  });
}

/** Tasdiqni bekor qiladi — profil ommaviy ro'yxatdan chiqadi. */
export async function unverifyDeveloper(params: {
  userId: string;
  adminId: string;
  reason: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await db.$transaction(async (tx) => {
    const profile = await tx.developerProfile.findUnique({
      where: { userId: params.userId },
      select: { id: true, verifiedAt: true },
    });

    if (!profile) {
      throw new DeveloperError("Profil topilmadi", "NOT_FOUND");
    }

    await tx.developerProfile.update({
      where: { userId: params.userId },
      data: { verifiedAt: null, acceptingWork: false },
    });

    await writeAudit(
      {
        actorId: params.adminId,
        action: AUDIT.APPLICATION_REJECTED,
        entityType: "User",
        entityId: params.userId,
        before: { verified: true },
        after: { verified: false, reason: params.reason },
        ip: params.ip,
        userAgent: params.userAgent,
      },
      tx
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin ro'yxati
// ─────────────────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  role: string;
  status: string;
  createdAt: Date;
  isVerifiedDeveloper: boolean;
  completedProjects: number;
};

/**
 * Admin uchun foydalanuvchilar ro'yxati.
 *
 * Standart tartib: tasdiqlanmagan mutaxassislar TEPADA — ular admindan
 * harakat kutmoqda, qolganlari esa faqat ma'lumot uchun.
 */
export async function listUsersForAdmin(options: {
  role?: string;
  unverifiedOnly?: boolean;
} = {}): Promise<AdminUserRow[]> {
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(options.role ? { role: options.role } : {}),
      ...(options.unverifiedOnly
        ? { role: UserRole.DEVELOPER, developerProfile: { verifiedAt: null } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
      developerProfile: { select: { verifiedAt: true, completedProjects: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    isVerifiedDeveloper: user.developerProfile?.verifiedAt !== null &&
      user.developerProfile?.verifiedAt !== undefined,
    completedProjects: user.developerProfile?.completedProjects ?? 0,
  }));
}

/** Tasdiqlanmagan mutaxassislar soni — admin navigatsiyasidagi raqam. */
export async function countUnverifiedDevelopers(): Promise<number> {
  return db.user.count({
    where: {
      role: UserRole.DEVELOPER,
      deletedAt: null,
      developerProfile: { verifiedAt: null },
    },
  });
}
