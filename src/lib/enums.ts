/**
 * Barcha holat (status) qiymatlarining YAGONA HAQIQAT MANBASI.
 *
 * SQLite'da Prisma `enum` ni qo'llamaydi, shuning uchun schema'da bu maydonlar
 * `String` sifatida turadi. Tip xavfsizligi shu fayl orqali ta'minlanadi:
 * DB yozishdan oldin Zod validatorlar shu ro'yxatlardan tekshiradi.
 *
 * QOIDA: schema.prisma dagi izohda ko'rsatilgan har bir "enums.ts → X"
 * shu fayldagi `X` ga to'g'ri kelishi kerak. Yangi qiymat qo'shsangiz,
 * uni ham shu yerga, ham `messages/uz.json` dagi tarjimaga qo'shing.
 */

/** `as const` obyektdan union tip yasaydi. */
type ValueOf<T> = T[keyof T];

// ─────────────────────────────────────────────────────────────────────────────
// Foydalanuvchi
// ─────────────────────────────────────────────────────────────────────────────

export const UserRole = {
  CUSTOMER: "CUSTOMER",
  DEVELOPER: "DEVELOPER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type UserRole = ValueOf<typeof UserRole>;

/**
 * Rol ierarxiyasi. Kattaroq son = kengroq huquq.
 * Ruxsat tekshirishda `rank(user.role) >= rank(required)` ishlatiladi.
 *
 * GUEST ro'yxatda yo'q — u ro'yxatdan o'tmagan tashrifchi, DB'da yozuvi bo'lmaydi.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  CUSTOMER: 10,
  DEVELOPER: 20,
  ADMIN: 90,
  SUPER_ADMIN: 100,
};

export const UserStatus = {
  /** Email/telefon tasdiqlanmagan — cheklangan kirish */
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  /** Admin vaqtincha to'xtatgan */
  SUSPENDED: "SUSPENDED",
  /** Butunlay bloklangan */
  BANNED: "BANNED",
  /** Foydalanuvchi o'zi o'chirgan (yumshoq o'chirish) */
  DELETED: "DELETED",
} as const;
export type UserStatus = ValueOf<typeof UserStatus>;

export const AuthProvider = {
  TELEGRAM: "TELEGRAM",
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
} as const;
export type AuthProvider = ValueOf<typeof AuthProvider>;

// ─────────────────────────────────────────────────────────────────────────────
// OTP va tasdiqlash
// ─────────────────────────────────────────────────────────────────────────────

export const OtpChannel = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  TELEGRAM: "TELEGRAM",
} as const;
export type OtpChannel = ValueOf<typeof OtpChannel>;

export const OtpPurpose = {
  LOGIN: "LOGIN",
  VERIFY_EMAIL: "VERIFY_EMAIL",
  VERIFY_PHONE: "VERIFY_PHONE",
  RESET_PASSWORD: "RESET_PASSWORD",
  /** Pul yechib olishni tasdiqlash — qo'shimcha xavfsizlik qatlami */
  CONFIRM_WITHDRAWAL: "CONFIRM_WITHDRAWAL",
} as const;
export type OtpPurpose = ValueOf<typeof OtpPurpose>;

/** Sessiya bekor qilinish sabablari (`Session.revokedReason`). */
export const SessionRevokeReason = {
  LOGOUT: "LOGOUT",
  /** Refresh token yangilandi — bu yozuv endi eski */
  ROTATED: "ROTATED",
  /** Ishlatilgan token qayta keldi → o'g'irlik ehtimoli, butun zanjir yopiladi */
  REUSE_DETECTED: "REUSE_DETECTED",
  ADMIN: "ADMIN",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  EXPIRED: "EXPIRED",
} as const;
export type SessionRevokeReason = ValueOf<typeof SessionRevokeReason>;

export const VerificationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type VerificationStatus = ValueOf<typeof VerificationStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Developer
// ─────────────────────────────────────────────────────────────────────────────

export const ApplicationStatus = {
  /** Ariza to'ldirilmoqda, hali yuborilmagan */
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  /** Admin test tayinladi */
  TEST_ASSIGNED: "TEST_ASSIGNED",
  TEST_SUBMITTED: "TEST_SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ApplicationStatus = ValueOf<typeof ApplicationStatus>;

/** Obro' darajalari. Tartib muhim — indeks = daraja. */
export const DEVELOPER_LEVELS = [
  "BEGINNER",
  "JUNIOR",
  "MIDDLE",
  "SENIOR",
  "EXPERT",
  "ELITE",
  "LEGEND",
] as const;
export type DeveloperLevel = (typeof DEVELOPER_LEVELS)[number];

/** Har bir darajaga chiqish uchun kerakli XP (kamida). */
export const LEVEL_XP_THRESHOLD: Record<DeveloperLevel, number> = {
  BEGINNER: 0,
  JUNIOR: 500,
  MIDDLE: 2_000,
  SENIOR: 6_000,
  EXPERT: 15_000,
  ELITE: 35_000,
  LEGEND: 75_000,
};

export const Availability = {
  AVAILABLE: "AVAILABLE",
  BUSY: "BUSY",
  /** Ta'tilda / vaqtincha ish qabul qilmaydi */
  AWAY: "AWAY",
} as const;
export type Availability = ValueOf<typeof Availability>;

export const SkillKind = {
  LANGUAGE: "LANGUAGE",
  FRAMEWORK: "FRAMEWORK",
  DATABASE: "DATABASE",
  DEVOPS: "DEVOPS",
  DESIGN: "DESIGN",
  OTHER: "OTHER",
} as const;
export type SkillKind = ValueOf<typeof SkillKind>;

export const QuestionKind = {
  CODING: "CODING",
  LOGIC: "LOGIC",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  PRACTICAL: "PRACTICAL",
  OPEN: "OPEN",
} as const;
export type QuestionKind = ValueOf<typeof QuestionKind>;

// ─────────────────────────────────────────────────────────────────────────────
// Loyiha
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectStatus = {
  /** Mijoz hali yozib tugatmagan */
  DRAFT: "DRAFT",
  /** Admin/AI tekshiruvida (spam, scam filtri) */
  PENDING_REVIEW: "PENDING_REVIEW",
  /** Ochiq — developerlar taklif yuborishi mumkin */
  OPEN: "OPEN",
  /** Developer tayinlangan, escrow to'langan, ish ketmoqda */
  IN_PROGRESS: "IN_PROGRESS",
  /** Developer topshirdi, mijoz tekshirmoqda */
  DELIVERED: "DELIVERED",
  /** Mijoz tuzatish so'radi */
  IN_REVISION: "IN_REVISION",
  /** Mijoz qabul qildi, pul taqsimlandi */
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
} as const;
export type ProjectStatus = ValueOf<typeof ProjectStatus>;

/**
 * Ruxsat etilgan holat o'tishlari. Boshqa har qanday o'tish xato hisoblanadi.
 * `src/lib/projects/transitions.ts` shu jadvaldan tekshiradi — holat mantig'i
 * bir joyda turadi, komponentlarga sochilmaydi.
 */
export const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["OPEN", "DRAFT", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DELIVERED", "CANCELLED", "DISPUTED"],
  DELIVERED: ["COMPLETED", "IN_REVISION", "DISPUTED"],
  IN_REVISION: ["DELIVERED", "CANCELLED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

/** Mijoz uchun "faol" hisoblangan holatlar. */
export const ACTIVE_PROJECT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "DELIVERED",
  "IN_REVISION",
  "DISPUTED",
] as const satisfies readonly ProjectStatus[];

export const ProjectVisibility = {
  PUBLIC: "PUBLIC",
  INVITE_ONLY: "INVITE_ONLY",
  PRIVATE: "PRIVATE",
} as const;
export type ProjectVisibility = ValueOf<typeof ProjectVisibility>;

export const ProjectEventType = {
  CREATED: "CREATED",
  PUBLISHED: "PUBLISHED",
  PROPOSAL_RECEIVED: "PROPOSAL_RECEIVED",
  DEVELOPER_ASSIGNED: "DEVELOPER_ASSIGNED",
  ESCROW_FUNDED: "ESCROW_FUNDED",
  FILE_UPLOADED: "FILE_UPLOADED",
  PROGRESS_UPDATE: "PROGRESS_UPDATE",
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  DELIVERED: "DELIVERED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  PAYMENT_RELEASED: "PAYMENT_RELEASED",
  REVIEW_LEFT: "REVIEW_LEFT",
  CANCELLED: "CANCELLED",
  DISPUTE_OPENED: "DISPUTE_OPENED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
} as const;
export type ProjectEventType = ValueOf<typeof ProjectEventType>;

export const ProposalStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ProposalStatus = ValueOf<typeof ProposalStatus>;

export const MilestoneStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
  APPROVED: "APPROVED",
  PAID: "PAID",
} as const;
export type MilestoneStatus = ValueOf<typeof MilestoneStatus>;

export const ProjectFileKind = {
  /** Mijoz texnik topshiriq bilan yuklagan */
  BRIEF: "BRIEF",
  /** Ish jarayonidagi oraliq natija */
  PROGRESS: "PROGRESS",
  /** Yakuniy topshiriladigan ish */
  DELIVERABLE: "DELIVERABLE",
} as const;
export type ProjectFileKind = ValueOf<typeof ProjectFileKind>;

// ─────────────────────────────────────────────────────────────────────────────
// Pul
// ─────────────────────────────────────────────────────────────────────────────

export const TransactionType = {
  /** Tashqi to'lov tizimidan hamyonga tushdi */
  DEPOSIT: "DEPOSIT",
  /** Hamyondan tashqariga chiqdi */
  WITHDRAWAL: "WITHDRAWAL",
  /** Loyiha uchun escrow'ga bloklandi */
  ESCROW_HOLD: "ESCROW_HOLD",
  /** Escrow'dan developerga o'tdi */
  ESCROW_RELEASE: "ESCROW_RELEASE",
  /** Platforma komissiyasi */
  COMMISSION: "COMMISSION",
  /** Mijozga qaytarildi */
  REFUND: "REFUND",
  /** Referal / promo bonusi */
  BONUS: "BONUS",
  /** Admin qo'lda tuzatishi — har doim AuditLog bilan birga */
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type TransactionType = ValueOf<typeof TransactionType>;

export const TransactionDirection = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type TransactionDirection = ValueOf<typeof TransactionDirection>;

export const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
} as const;
export type TransactionStatus = ValueOf<typeof TransactionStatus>;

export const EscrowStatus = {
  /** Yaratildi, lekin pul hali kelmagan */
  CREATED: "CREATED",
  /** Mijoz to'ladi, pul bloklangan */
  FUNDED: "FUNDED",
  /** Developerga to'landi, komissiya ushlandi */
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  DISPUTED: "DISPUTED",
} as const;
export type EscrowStatus = ValueOf<typeof EscrowStatus>;

export const WithdrawalStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type WithdrawalStatus = ValueOf<typeof WithdrawalStatus>;

export const PaymentProvider = {
  CLICK: "CLICK",
  PAYME: "PAYME",
  UZUM: "UZUM",
  CARD: "CARD",
  /** Admin qo'lda kiritdi (bank o'tkazmasi) */
  MANUAL: "MANUAL",
} as const;
export type PaymentProvider = ValueOf<typeof PaymentProvider>;

export const WithdrawalMethod = {
  CARD: "CARD",
  BANK: "BANK",
  CLICK: "CLICK",
  PAYME: "PAYME",
  UZUM: "UZUM",
  CRYPTO: "CRYPTO",
} as const;
export type WithdrawalMethod = ValueOf<typeof WithdrawalMethod>;

/** Tizim hamyonlari — foydalanuvchiga tegishli emas. */
export const SystemWallet = {
  /** Platforma komissiyalari yig'iladigan hamyon */
  PLATFORM_REVENUE: "PLATFORM_REVENUE",
  /** Escrow'da bloklangan pullarning umumiy hisobi */
  ESCROW_HOLDING: "ESCROW_HOLDING",
} as const;
export type SystemWallet = ValueOf<typeof SystemWallet>;

export const DisputeStatus = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type DisputeStatus = ValueOf<typeof DisputeStatus>;

export const DisputeResolution = {
  /** Pul to'liq mijozga qaytadi */
  REFUND_CUSTOMER: "REFUND_CUSTOMER",
  /** Pul developerga o'tadi */
  PAY_DEVELOPER: "PAY_DEVELOPER",
  /** Kelishuv — `customerShareBps` bo'yicha bo'linadi */
  SPLIT: "SPLIT",
} as const;
export type DisputeResolution = ValueOf<typeof DisputeResolution>;

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

export const ConversationKind = {
  PROJECT: "PROJECT",
  DIRECT: "DIRECT",
  SUPPORT: "SUPPORT",
} as const;
export type ConversationKind = ValueOf<typeof ConversationKind>;

export const MessageKind = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  FILE: "FILE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  CODE: "CODE",
  /** Tizim yozgan xabar (holat o'zgardi, developer qo'shildi...) */
  SYSTEM: "SYSTEM",
} as const;
export type MessageKind = ValueOf<typeof MessageKind>;

// ─────────────────────────────────────────────────────────────────────────────
// Xabarnomalar
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationChannel = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  TELEGRAM: "TELEGRAM",
  SMS: "SMS",
  PUSH: "PUSH",
} as const;
export type NotificationChannel = ValueOf<typeof NotificationChannel>;

export const NotificationType = {
  // Loyiha
  PROJECT_PUBLISHED: "PROJECT_PUBLISHED",
  PROPOSAL_RECEIVED: "PROPOSAL_RECEIVED",
  PROPOSAL_ACCEPTED: "PROPOSAL_ACCEPTED",
  PROPOSAL_REJECTED: "PROPOSAL_REJECTED",
  PROJECT_DELIVERED: "PROJECT_DELIVERED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
  PROJECT_CANCELLED: "PROJECT_CANCELLED",
  DEADLINE_SOON: "DEADLINE_SOON",
  // Pul
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  ESCROW_FUNDED: "ESCROW_FUNDED",
  PAYMENT_RELEASED: "PAYMENT_RELEASED",
  WITHDRAWAL_APPROVED: "WITHDRAWAL_APPROVED",
  WITHDRAWAL_REJECTED: "WITHDRAWAL_REJECTED",
  WITHDRAWAL_PAID: "WITHDRAWAL_PAID",
  // Chat
  NEW_MESSAGE: "NEW_MESSAGE",
  // Hisob
  APPLICATION_APPROVED: "APPLICATION_APPROVED",
  APPLICATION_REJECTED: "APPLICATION_REJECTED",
  IDENTITY_APPROVED: "IDENTITY_APPROVED",
  IDENTITY_REJECTED: "IDENTITY_REJECTED",
  BADGE_AWARDED: "BADGE_AWARDED",
  LEVEL_UP: "LEVEL_UP",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  // Xavfsizlik
  NEW_LOGIN: "NEW_LOGIN",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  // Tizim
  SUPPORT_REPLY: "SUPPORT_REPLY",
  ANNOUNCEMENT: "ANNOUNCEMENT",
} as const;
export type NotificationType = ValueOf<typeof NotificationType>;

// ─────────────────────────────────────────────────────────────────────────────
// Kontent
// ─────────────────────────────────────────────────────────────────────────────

export const ContentStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContentStatus = ValueOf<typeof ContentStatus>;

export const TicketStatus = {
  OPEN: "OPEN",
  PENDING: "PENDING",
  ANSWERED: "ANSWERED",
  CLOSED: "CLOSED",
} as const;
export type TicketStatus = ValueOf<typeof TicketStatus>;

export const TicketPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TicketPriority = ValueOf<typeof TicketPriority>;

export const FavoriteTarget = {
  DEVELOPER: "DEVELOPER",
  PROJECT: "PROJECT",
  SERVICE: "SERVICE",
} as const;
export type FavoriteTarget = ValueOf<typeof FavoriteTarget>;

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────

/** `as const` obyektining qiymatlarini Zod uchun massiv sifatida qaytaradi. */
export function valuesOf<T extends Record<string, string>>(
  obj: T
): [ValueOf<T>, ...ValueOf<T>[]] {
  return Object.values(obj) as [ValueOf<T>, ...ValueOf<T>[]];
}

/** Berilgan rol talab qilingan roldan kam emasligini tekshiradi. */
export function hasRole(role: string, required: UserRole): boolean {
  const rank = ROLE_RANK[role as UserRole];
  if (rank === undefined) return false;
  return rank >= ROLE_RANK[required];
}

export function isAdminRole(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

/** XP miqdoriga mos darajani hisoblaydi. */
export function levelForXp(xp: number): DeveloperLevel {
  let result: DeveloperLevel = "BEGINNER";
  for (const level of DEVELOPER_LEVELS) {
    if (xp >= LEVEL_XP_THRESHOLD[level]) result = level;
    else break;
  }
  return result;
}

/** Keyingi darajaga qancha XP qolgani. Oxirgi darajada `null`. */
export function xpToNextLevel(xp: number): { next: DeveloperLevel; remaining: number } | null {
  const current = levelForXp(xp);
  const index = DEVELOPER_LEVELS.indexOf(current);
  const next = DEVELOPER_LEVELS[index + 1];
  if (!next) return null;
  return { next, remaining: LEVEL_XP_THRESHOLD[next] - xp };
}

/** Loyiha holatini o'zgartirish ruxsat etilganmi. */
export function canTransition(from: string, to: string): boolean {
  const allowed = PROJECT_TRANSITIONS[from as ProjectStatus];
  if (!allowed) return false;
  return allowed.includes(to as ProjectStatus);
}
