import { AUDIT, writeAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Availability, SessionRevokeReason, UserRole } from "@/lib/enums";
import {
  readJsonField,
  typeOverridesSchema,
  writeJsonField,
} from "@/lib/json-field";
import type { Tiyin } from "@/lib/money";

/**
 * FOYDALANUVCHI HISOBI
 *
 * Profil, parol, email va sessiyalar. Barchasi bitta joyda, chunki
 * ularning hammasi bir xil xavfsizlik qoidalariga tayanadi:
 *
 *   • Hisobga ta'sir qiladigan o'zgarish PAROL BILAN tasdiqlanadi
 *   • Har o'zgarish audit jurnaliga tushadi
 *   • Kirish ma'lumoti o'zgarsa boshqa sessiyalar YOPILADI
 *
 * Oxirgi qoida eng muhimi: agar hisob o'g'irlangan bo'lsa, egasi
 * parolni almashtirgach o'g'ri darhol chiqarib tashlanishi kerak.
 */

export class AccountError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "WRONG_PASSWORD"
      | "NO_PASSWORD"
      | "EMAIL_TAKEN"
      | "USERNAME_TAKEN"
      | "SAME_VALUE"
      | "NOT_DEVELOPER"
  ) {
    super(message);
    this.name = "AccountError";
  }
}

export function accountErrorMessage(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  return "Amal bajarilmadi. Qayta urinib ko'ring.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Profilni o'qish
// ─────────────────────────────────────────────────────────────────────────────

export type EditableProfile = {
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  /** Developer bo'lmasa `null` */
  developer: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    telegramUsername: string | null;
    yearsExperience: number;
    hourlyRate: Tiyin;
    availability: string;
    acceptingWork: boolean;
    /** Admin tasdig'i. `false` bo'lsa ommaviy profil ko'rinmaydi. */
    isVerified: boolean;
    /** ISO kodlari: uz, ru, en… */
    languages: string[];
  } | null;
};

export async function getEditableProfile(
  userId: string
): Promise<EditableProfile | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      email: true,
      phone: true,
      avatarUrl: true,
      passwordHash: true,
      emailVerifiedAt: true,
      developerProfile: {
        select: {
          headline: true,
          bio: true,
          location: true,
          githubUrl: true,
          linkedinUrl: true,
          portfolioUrl: true,
          telegramUsername: true,
          yearsExperience: true,
          hourlyRate: true,
          availability: true,
          acceptingWork: true,
          verifiedAt: true,
          languages: { select: { code: true } },
        },
      },
    },
  });

  if (!user) return null;

  const profile = user.developerProfile;

  return {
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    // Parol hash'ini KLIENTGA UZATMAYMIZ — faqat bor-yo'qligini.
    hasPassword: Boolean(user.passwordHash),
    emailVerified: Boolean(user.emailVerifiedAt),
    developer: profile
      ? {
          headline: profile.headline,
          bio: profile.bio,
          location: profile.location,
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
          portfolioUrl: profile.portfolioUrl,
          telegramUsername: profile.telegramUsername,
          yearsExperience: profile.yearsExperience,
          hourlyRate: profile.hourlyRate,
          availability: profile.availability,
          acceptingWork: profile.acceptingWork,
          isVerified: Boolean(profile.verifiedAt),
          languages: profile.languages.map((row) => row.code),
        }
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy profil
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateProfileInput = {
  name: string;
  username?: string | undefined;
  avatarUrl?: string | undefined;
};

/**
 * Ism, ommaviy manzil va avatar.
 *
 * Parol talab QILINMAYDI: bu ma'lumot ochiq va uni o'zgartirish hisobni
 * egallab olishga yo'l bermaydi. Email va parol esa boshqa gap — pastga
 * qarang.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<void> {
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, avatarUrl: true },
  });

  if (!current) {
    throw new AccountError("Foydalanuvchi topilmadi", "NOT_FOUND");
  }

  const username = input.username?.toLowerCase();

  if (username && username !== current.username) {
    const taken = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (taken && taken.id !== userId) {
      throw new AccountError(
        "Bu manzil band. Boshqasini tanlang.",
        "USERNAME_TAKEN"
      );
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      // `undefined` — tegilmaydi. Bo'sh matn allaqachon validatorda
      // `undefined` ga aylantirilgan.
      username: username ?? undefined,
      avatarUrl: input.avatarUrl ?? undefined,
    },
  });

  await writeAudit({
    actorId: userId,
    action: AUDIT.PROFILE_UPDATED,
    entityType: "User",
    entityId: userId,
    before: current,
    after: { name: input.name, username: username ?? current.username },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer profili
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateDeveloperInput = {
  headline?: string | undefined;
  bio?: string | undefined;
  location?: string | undefined;
  githubUrl?: string | undefined;
  linkedinUrl?: string | undefined;
  portfolioUrl?: string | undefined;
  telegramUsername?: string | undefined;
  yearsExperience: number;
  hourlyRate: Tiyin;
  availability: string;
  acceptingWork: boolean;
  languages: string[];
};

/**
 * Developer profilini yangilaydi.
 *
 * Profil YO'Q bo'lsa yaratiladi: rol DEVELOPER bo'lgani bilan profil
 * qatori bo'lmasligi mumkin (masalan admin rolni qo'lda o'zgartirgan).
 * Bunday holatda "profil topilmadi" deb qaytarish foydalanuvchini
 * boshi berk ko'chaga olib boradi.
 */
export async function updateDeveloperProfile(
  userId: string,
  input: UpdateDeveloperInput
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new AccountError("Foydalanuvchi topilmadi", "NOT_FOUND");
  }

  if (user.role !== UserRole.DEVELOPER) {
    throw new AccountError(
      "Bu bo'lim faqat mutaxassislar uchun",
      "NOT_DEVELOPER"
    );
  }

  const data = {
    headline: input.headline ?? null,
    bio: input.bio ?? null,
    location: input.location ?? null,
    githubUrl: input.githubUrl ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    portfolioUrl: input.portfolioUrl ?? null,
    telegramUsername: input.telegramUsername ?? null,
    yearsExperience: input.yearsExperience,
    hourlyRate: input.hourlyRate,
    availability: input.availability,
    acceptingWork: input.acceptingWork,
  };

  await db.$transaction(async (tx) => {
    const profile = await tx.developerProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      select: { id: true },
    });

    // Tillar: eski ro'yxat o'chiriladi va yangisi yoziladi. Bu
    // "farqni topish" mantig'idan sodda va natija bir xil — ro'yxat
    // kichik (odatda 2-4 til).
    await tx.developerLanguage.deleteMany({
      where: { developerProfileId: profile.id },
    });

    if (input.languages.length > 0) {
      await tx.developerLanguage.createMany({
        data: input.languages.map((code) => ({
          developerProfileId: profile.id,
          code,
        })),
      });
    }
  });

  await writeAudit({
    actorId: userId,
    action: AUDIT.PROFILE_UPDATED,
    entityType: "DeveloperProfile",
    entityId: userId,
    after: { availability: input.availability, acceptingWork: input.acceptingWork },
  });
}

/**
 * "Ish qabul qilaman / qilmayapman" tugmasi.
 *
 * Alohida funksiya: bu eng ko'p ishlatiladigan amal va uni butun
 * formani yuborishga bog'lash noqulay.
 */
export async function setAvailability(
  userId: string,
  availability: string
): Promise<void> {
  if (!Object.values(Availability).includes(availability as never)) {
    throw new AccountError("Noto'g'ri holat", "NOT_FOUND");
  }

  const profile = await db.developerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new AccountError("Mutaxassis profili topilmadi", "NOT_DEVELOPER");
  }

  await db.developerProfile.update({
    where: { userId },
    data: {
      availability,
      // "Band" holatida yangi taklif yuborishning ma'nosi yo'q.
      acceptingWork: availability === Availability.AVAILABLE,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Parol
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parolni o'zgartiradi va BOSHQA BARCHA SESSIYALARNI YOPADI.
 *
 * Sessiyalarni yopish shart: parol o'zgartirishning asosiy sababi —
 * "kimdir hisobimga kirgan" shubhasi. Sessiyalar qolsa o'g'ri ishlashda
 * davom etadi va parol almashtirishning ma'nosi yo'qoladi.
 *
 * Hozirgi sessiya QOLDIRILADI — aks holda foydalanuvchi o'zi
 * chiqarilib, "nima bo'ldi?" degan savol bilan qolardi.
 */
export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  /** Bu sessiya yopilmaydi */
  keepSessionId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ revokedSessions: number }> {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new AccountError("Foydalanuvchi topilmadi", "NOT_FOUND");
  }

  if (!user.passwordHash) {
    // OTP yoki Telegram bilan kirgan hisob. Bu yerda "parol o'rnatish"
    // oqimi kerak, "o'zgartirish" emas.
    throw new AccountError(
      "Hisobingizda parol yo'q. Parolni tiklash orqali o'rnatasiz.",
      "NO_PASSWORD"
    );
  }

  const valid = await verifyPassword(params.currentPassword, user.passwordHash);

  if (!valid) {
    throw new AccountError("Hozirgi parol noto'g'ri", "WRONG_PASSWORD");
  }

  const passwordHash = await hashPassword(params.newPassword);

  await db.user.update({
    where: { id: params.userId },
    data: {
      passwordHash,
      // Muvaffaqiyatli parol o'zgarishi bloklanish hisobini ham tozalaydi.
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  const revokedSessions = await revokeAllUserSessions(
    params.userId,
    SessionRevokeReason.PASSWORD_CHANGED,
    { exceptSessionId: params.keepSessionId }
  );

  await writeAudit({
    actorId: params.userId,
    action: AUDIT.PASSWORD_CHANGED,
    entityType: "User",
    entityId: params.userId,
    after: { revokedSessions },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { revokedSessions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emailni o'zgartiradi.
 *
 * PAROL TALAB QILINADI: email — parolni tiklash kanali. Uni parolsiz
 * o'zgartirish mumkin bo'lsa, hisobga bir marta kirgan odam emailni
 * o'ziga almashtirib, keyin parolni tiklab hisobni butunlay egallab
 * olardi.
 *
 * Yangi email TASDIQLANMAGAN holatda saqlanadi — tasdiqlash xati
 * SMTP ulanganda yuboriladi.
 */
export async function changeEmail(params: {
  userId: string;
  newEmail: string;
  currentPassword: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, passwordHash: true },
  });

  if (!user) {
    throw new AccountError("Foydalanuvchi topilmadi", "NOT_FOUND");
  }

  if (!user.passwordHash) {
    throw new AccountError(
      "Emailni o'zgartirish uchun avval parol o'rnatishingiz kerak.",
      "NO_PASSWORD"
    );
  }

  const valid = await verifyPassword(params.currentPassword, user.passwordHash);

  if (!valid) {
    throw new AccountError("Parol noto'g'ri", "WRONG_PASSWORD");
  }

  if (user.email === params.newEmail) {
    throw new AccountError("Bu allaqachon sizning emailingiz", "SAME_VALUE");
  }

  const taken = await db.user.findUnique({
    where: { email: params.newEmail },
    select: { id: true },
  });

  if (taken) {
    throw new AccountError("Bu email boshqa hisobga ulangan", "EMAIL_TAKEN");
  }

  await db.user.update({
    where: { id: params.userId },
    data: {
      email: params.newEmail,
      // Yangi manzil tasdiqlanmagan — eski tasdiqni saqlab qolish
      // xavfli bo'lardi.
      emailVerifiedAt: null,
    },
  });

  await writeAudit({
    actorId: params.userId,
    action: AUDIT.PROFILE_UPDATED,
    entityType: "User",
    entityId: params.userId,
    before: { email: user.email },
    after: { email: params.newEmail, emailVerified: false },
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessiyalar
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceSession = {
  id: string;
  device: string;
  ip: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  /** Hozir shu qurilmadan kirilgan */
  isCurrent: boolean;
};

/** Faol sessiyalar — "qurilmalar" ro'yxati uchun. */
export async function listDevices(
  userId: string,
  currentSessionId: string
): Promise<DeviceSession[]> {
  const { listActiveSessions } = await import("@/lib/auth/session");
  const sessions = await listActiveSessions(userId);

  return sessions.map((session) => ({
    id: session.id,
    // `deviceLabel` sessiya yaratilganda `describeDevice` bilan
    // to'ldiriladi. Bo'sh bo'lsa (eski yozuv) tushunarli zaxira matn.
    device: session.deviceLabel ?? "Noma'lum qurilma",
    ip: session.ip,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    isCurrent: session.id === currentSessionId,
  }));
}

/**
 * Bitta qurilmani chiqaradi.
 *
 * Egalik TEKSHIRILADI: sessiya id'si taxmin qilinishi mumkin, shuning
 * uchun boshqa odamning sessiyasini yopishga yo'l bermaymiz.
 */
export async function revokeDevice(params: {
  userId: string;
  sessionId: string;
}): Promise<void> {
  const session = await db.session.findUnique({
    where: { id: params.sessionId },
    select: { userId: true },
  });

  if (!session || session.userId !== params.userId) {
    throw new AccountError("Sessiya topilmadi", "NOT_FOUND");
  }

  const { revokeSession } = await import("@/lib/auth/session");
  await revokeSession(params.sessionId, SessionRevokeReason.LOGOUT);

  await writeAudit({
    actorId: params.userId,
    action: AUDIT.SESSIONS_REVOKED,
    entityType: "Session",
    entityId: params.sessionId,
    after: { revoked: 1, by: "user" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Xabarnoma sozlamalari
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationChannels = {
  email: boolean;
  telegram: boolean;
  push: boolean;
  sms: boolean;
  /** "22:00" — bezovta qilmaslik boshlanishi. `null` = o'chirilgan. */
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

/** Yozuv bo'lmagan foydalanuvchi uchun standart. */
const DEFAULT_CHANNELS: NotificationChannels = {
  // Xabar OLISH standart holat: foydalanuvchi hech narsa sozlamagan
  // bo'lsa muhim xabarni o'tkazib yubormasligi kerak.
  email: true,
  telegram: true,
  push: true,
  // SMS pullik — sukut bilan o'chirilgan.
  sms: false,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationChannels> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId },
    select: {
      emailEnabled: true,
      telegramEnabled: true,
      pushEnabled: true,
      smsEnabled: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  if (!pref) return DEFAULT_CHANNELS;

  return {
    email: pref.emailEnabled,
    telegram: pref.telegramEnabled,
    push: pref.pushEnabled,
    sms: pref.smsEnabled,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationChannels
): Promise<void> {
  const data = {
    emailEnabled: input.email,
    telegramEnabled: input.telegram,
    pushEnabled: input.push,
    smsEnabled: input.sms,
    quietHoursStart: input.quietHoursStart,
    quietHoursEnd: input.quietHoursEnd,
  };

  await db.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

/**
 * Tur bo'yicha nozik sozlamalar (`prefsJson`).
 *
 * Shakl: `{"PROJECT_MESSAGE": {"email": false}}` — ya'ni "loyiha
 * xabarlari uchun email yubormang, qolgan kanallar ishlasin".
 *
 * Alohida saqlanadi, chunki turlar ro'yxati o'sib boradi va har biri
 * uchun ustun qo'shish sxemani shishirib yuborardi.
 */
export type TypeOverrides = Record<string, Partial<Record<string, boolean>>>;

export async function getTypeOverrides(userId: string): Promise<TypeOverrides> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId },
    select: { prefsJson: true },
  });

  if (!pref) return {};

  // Buzuq JSON sozlamalar sahifasini yiqitmasligi kerak.
  return readJsonField<TypeOverrides>(
    pref.prefsJson,
    typeOverridesSchema,
    {},
    "NotificationPreference.prefsJson"
  );
}

export async function setTypeOverride(params: {
  userId: string;
  type: string;
  channel: string;
  enabled: boolean;
}): Promise<void> {
  const current = await getTypeOverrides(params.userId);

  const forType = { ...current[params.type], [params.channel]: params.enabled };
  const next: TypeOverrides = { ...current, [params.type]: forType };

  await db.notificationPreference.upsert({
    where: { userId: params.userId },
    update: { prefsJson: writeJsonField(next) },
    create: { userId: params.userId, prefsJson: writeJsonField(next) },
  });
}
