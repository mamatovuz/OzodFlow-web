import { db } from "@/lib/db";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from "@/lib/auth/tokens";
import { SessionRevokeReason, UserRole, UserStatus } from "@/lib/enums";

/**
 * SESSIYA HAYOTIY DAVRI
 *
 * Bitta qurilma = bitta sessiya zanjiri. Refresh token har ishlatilganda
 * YANGILANADI (rotatsiya): eski yozuv bekor qilinadi, yangisi yaratiladi va
 * ikkisi `replacedById` bilan bog'lanadi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA ROTATSIYA VA ZANJIR
 *
 *  Refresh token o'g'irlansa, hujumchi undan foydalanib yangi token oladi.
 *  Rotatsiya bo'lmasa buni sezish imkoni yo'q — ikki tomon bitta tokenni
 *  cheksiz ishlatadi.
 *
 *  Rotatsiya bilan esa: token bir marta ishlatilgach kuchini yo'qotadi.
 *  Agar ALLAQACHON ISHLATILGAN token qayta kelsa — demak nusxa bor.
 *  Bu holda haqiqiy egasi kim ekanini aniqlash imkoni yo'q, shuning uchun
 *  foydalanuvchining BARCHA sessiyalari yopiladi va u qaytadan kirishi
 *  kerak bo'ladi. Noqulay, lekin hisobni qo'ldan chiqarishdan yaxshi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type ClientInfo = {
  userAgent?: string | null;
  ip?: string | null;
  deviceLabel?: string | null;
};

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

/**
 * Yangi sessiya ochadi (kirish paytida).
 */
export async function createSession(
  user: { id: string; role: string },
  client: ClientInfo = {}
): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashRefreshToken(refreshToken);

  const session = await db.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      expiresAt: refreshTokenExpiry(),
      userAgent: client.userAgent?.slice(0, 300) ?? null,
      ip: client.ip ?? null,
      deviceLabel: client.deviceLabel ?? describeDevice(client.userAgent),
    },
    select: { id: true },
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role as UserRole,
    sessionId: session.id,
  });

  return { accessToken, refreshToken, sessionId: session.id };
}

export type RotateResult =
  | { status: "ok"; tokens: IssuedTokens }
  /** Token topilmadi, muddati o'tdi yoki bekor qilingan */
  | { status: "invalid" }
  /** Ishlatilgan token qayta keldi — barcha sessiyalar yopildi */
  | { status: "reuse_detected"; userId: string }
  /** Foydalanuvchi bloklangan yoki o'chirilgan */
  | { status: "user_blocked"; reason: string };

/**
 * Refresh tokenni yangi juftlikka almashtiradi.
 */
export async function rotateSession(
  refreshToken: string,
  client: ClientInfo = {}
): Promise<RotateResult> {
  const refreshTokenHash = await hashRefreshToken(refreshToken);

  const session = await db.session.findUnique({
    where: { refreshTokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      revokedReason: true,
      user: { select: { id: true, role: true, status: true, deletedAt: true } },
    },
  });

  if (!session) return { status: "invalid" };

  // ── O'g'irlikni aniqlash ────────────────────────────────────────────────
  // Bekor qilingan token qayta keldi. Sababi ROTATED bo'lsa — bu token
  // allaqachon ishlatilgan, ya'ni nusxasi mavjud.
  if (session.revokedAt) {
    if (session.revokedReason === SessionRevokeReason.ROTATED) {
      await revokeAllUserSessions(
        session.userId,
        SessionRevokeReason.REUSE_DETECTED
      );

      await db.auditLog.create({
        data: {
          actorId: session.userId,
          action: "auth.refresh_token_reuse_detected",
          entityType: "Session",
          entityId: session.id,
          ip: client.ip ?? null,
          userAgent: client.userAgent?.slice(0, 300) ?? null,
          afterJson: JSON.stringify({
            note: "Ishlatilgan refresh token qayta keldi. Barcha sessiyalar yopildi.",
          }),
        },
      });

      return { status: "reuse_detected", userId: session.userId };
    }

    return { status: "invalid" };
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: SessionRevokeReason.EXPIRED },
    });
    return { status: "invalid" };
  }

  // ── Foydalanuvchi holati ────────────────────────────────────────────────
  // Token amal qilsa ham, hisob bloklangan bo'lsa kirish berilmaydi.
  if (session.user.deletedAt) {
    return { status: "user_blocked", reason: UserStatus.DELETED };
  }
  if (
    session.user.status === UserStatus.BANNED ||
    session.user.status === UserStatus.SUSPENDED
  ) {
    return { status: "user_blocked", reason: session.user.status };
  }

  // ── Rotatsiya ───────────────────────────────────────────────────────────
  const nextToken = generateRefreshToken();
  const nextHash = await hashRefreshToken(nextToken);

  // Bitta tranzaksiya: yangi yozuv yaratiladi va eskisi shu zahoti bekor
  // qilinadi. Yarim holat qolsa (yangisi bor, eskisi hali amal qiladi) —
  // ikkita ishlaydigan token paydo bo'lardi.
  const nextSession = await db.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: nextHash,
        expiresAt: refreshTokenExpiry(),
        userAgent: client.userAgent?.slice(0, 300) ?? null,
        ip: client.ip ?? null,
        deviceLabel: describeDevice(client.userAgent),
      },
      select: { id: true },
    });

    await tx.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        revokedReason: SessionRevokeReason.ROTATED,
        replacedById: created.id,
        lastUsedAt: new Date(),
      },
    });

    return created;
  });

  const accessToken = await signAccessToken({
    userId: session.userId,
    role: session.user.role as UserRole,
    sessionId: nextSession.id,
  });

  return {
    status: "ok",
    tokens: { accessToken, refreshToken: nextToken, sessionId: nextSession.id },
  };
}

/** Bitta sessiyani yopadi (chiqish, yoki adminning majburiy chiqarishi). */
export async function revokeSession(
  sessionId: string,
  reason: string = SessionRevokeReason.LOGOUT
): Promise<void> {
  await db.session.updateMany({
    // `updateMany` — sessiya allaqachon yopilgan bo'lsa xato bermaydi.
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

/**
 * Foydalanuvchining barcha faol sessiyalarini yopadi.
 *
 * Chaqiriladigan holatlar: parol o'zgardi, o'g'irlik aniqlandi,
 * admin hisobni bloklandi, foydalanuvchi "barcha qurilmalardan chiqish"
 * tugmasini bosdi.
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: string = SessionRevokeReason.ADMIN,
  options: { exceptSessionId?: string } = {}
): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(options.exceptSessionId ? { id: { not: options.exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date(), revokedReason: reason },
  });

  return result.count;
}

/** Foydalanuvchining faol sessiyalari — "Qurilmalar" sozlamalari uchun. */
export async function listActiveSessions(userId: string) {
  return db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      deviceLabel: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

/**
 * Muddati o'tgan va bekor qilingan sessiyalarni tozalaydi.
 *
 * Nega kerak: `Session` jadvali har kirish va har rotatsiyada o'sadi.
 * Faol foydalanuvchida kuniga o'nlab yozuv paydo bo'ladi. Tarixni
 * cheksiz saqlashning ma'nosi yo'q — audit uchun `AuditLog` bor.
 *
 * Reja bo'yicha (cron yoki admin paneldan) chaqiriladi.
 */
export async function pruneSessions(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000);

  const result = await db.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { revokedAt: { lt: cutoff } },
      ],
    },
  });

  return result.count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Qurilma nomi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User-Agent'dan o'qiladigan qurilma nomi yasaydi: "Chrome — Windows".
 *
 * To'liq UA parser (ua-parser-js) qo'shilmadi: bu ma'lumot faqat
 * "Qurilmalar" ro'yxatida ko'rsatiladi, unga tayanib qaror qabul
 * qilinmaydi. Taxminiy natija yetarli.
 */
function describeDevice(userAgent?: string | null): string | null {
  if (!userAgent) return null;

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Brauzer";

  const platform =
    /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : null;

  return platform ? `${browser} — ${platform}` : browser;
}
