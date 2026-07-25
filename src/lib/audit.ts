import { db, type DbClient } from "@/lib/db";
import { getRequestInfo } from "@/lib/request-info";

/**
 * AUDIT LOG
 *
 * Pul, rol va sozlamalarga tegadigan HAR BIR amal shu jadvalga yoziladi.
 *
 * Nega kerak: nizo yoki firibgarlik tekshiruvida "kim, qachon, nimani
 * o'zgartirdi" savoliga javob bo'lishi kerak. Bunday jurnal bo'lmasa
 * escrow'dan pul chiqib ketgan holatni tekshirish imkonsiz.
 *
 * QOIDA: audit yozuvi amalning O'ZI bilan BIR TRANZAKSIYADA bo'lishi kerak.
 * Aks holda amal bajarilib, jurnal yozilmay qolishi mumkin. Shu sababli
 * funksiyalar `DbClient` qabul qiladi — tranzaksiya ichidan chaqirish uchun.
 */

/**
 * Amal nomlari. Erkin matn EMAS — ro'yxat, chunki jurnalni filtrlash va
 * hisobot yasash uchun nomlar barqaror bo'lishi kerak.
 */
export const AUDIT = {
  // Auth
  LOGIN_SUCCESS: "auth.login_success",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  REGISTER: "auth.register",
  PASSWORD_CHANGED: "auth.password_changed",
  PASSWORD_RESET: "auth.password_reset",
  EMAIL_VERIFIED: "auth.email_verified",
  PHONE_VERIFIED: "auth.phone_verified",
  SESSIONS_REVOKED: "auth.sessions_revoked",
  REFRESH_REUSE: "auth.refresh_token_reuse_detected",
  ACCOUNT_LOCKED: "auth.account_locked",

  // Foydalanuvchi
  ROLE_CHANGED: "user.role_changed",
  STATUS_CHANGED: "user.status_changed",
  PROFILE_UPDATED: "user.profile_updated",
  ACCOUNT_DELETED: "user.account_deleted",

  // Developer arizasi
  APPLICATION_SUBMITTED: "application.submitted",
  APPLICATION_APPROVED: "application.approved",
  APPLICATION_REJECTED: "application.rejected",
  IDENTITY_APPROVED: "identity.approved",
  IDENTITY_REJECTED: "identity.rejected",

  // Loyiha
  PROJECT_CREATED: "project.created",
  PROJECT_PUBLISHED: "project.published",
  PROJECT_STATUS_CHANGED: "project.status_changed",
  PROJECT_ASSIGNED: "project.assigned",
  PROJECT_CANCELLED: "project.cancelled",

  // Pul — eng muhim bo'lim
  ESCROW_FUNDED: "escrow.funded",
  ESCROW_RELEASED: "escrow.released",
  ESCROW_REFUNDED: "escrow.refunded",
  WALLET_ADJUSTED: "wallet.adjusted",
  WITHDRAWAL_REQUESTED: "withdrawal.requested",
  WITHDRAWAL_APPROVED: "withdrawal.approved",
  WITHDRAWAL_REJECTED: "withdrawal.rejected",
  WITHDRAWAL_PAID: "withdrawal.paid",
  PAYMENT_RECEIVED: "payment.received",
  DISPUTE_OPENED: "dispute.opened",
  DISPUTE_RESOLVED: "dispute.resolved",

  // Tizim
  SETTING_UPDATED: "setting.updated",
  BOOTSTRAP_ADMIN: "system.bootstrap_super_admin",
  MAINTENANCE_TOGGLED: "system.maintenance_toggled",
} as const;

export type AuditAction = (typeof AUDIT)[keyof typeof AUDIT];

export type AuditEntry = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  /** O'zgarishdan oldingi holat */
  before?: unknown;
  /** O'zgarishdan keyingi holat */
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * `bigint` qiymatlarni JSON'ga yozish uchun matnga aylantiradi.
 *
 * `JSON.stringify` bigint bilan xato tashlaydi. Audit yozuvida pul
 * summalari ko'p bo'ladi, shuning uchun bu almashtiruvchi shart.
 */
function serializeForAudit(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item
  );
}

/**
 * Audit yozuvini yaratadi.
 *
 * `client` berilsa tranzaksiya ichida yoziladi — pul amallari uchun
 * SHU YO'L ISHLATILADI.
 */
export async function writeAudit(
  entry: AuditEntry,
  client: DbClient = db
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      beforeJson: serializeForAudit(entry.before),
      afterJson: serializeForAudit(entry.after),
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, 300) ?? null,
    },
  });
}

/**
 * So'rov ma'lumotlarini (IP, User-Agent) o'zi olib yozadi.
 *
 * Faqat so'rov konteksti mavjud joyda ishlatiladi (server action,
 * route handler). Fon vazifalarida `writeAudit` ishlatiladi.
 */
export async function auditRequest(
  entry: Omit<AuditEntry, "ip" | "userAgent">
): Promise<void> {
  const info = await getRequestInfo();
  await writeAudit({ ...entry, ip: info.ip, userAgent: info.userAgent });
}

/**
 * Audit yozuvi ASOSIY AMALNI YIQITMASLIGI kerak bo'lgan holatlar uchun.
 *
 * Masalan: kirish muvaffaqiyatli bo'ldi, lekin jurnal yozilmadi. Bunda
 * foydalanuvchini kiritmaslik noto'g'ri bo'lardi — xato log'ga yoziladi
 * va davom etiladi.
 *
 * MUHIM: pul amallarida BU FUNKSIYA ISHLATILMAYDI. O'sha yerda jurnal
 * yozilmasligi — amalni bekor qilish uchun yetarli sabab.
 */
export async function auditSafely(
  entry: Omit<AuditEntry, "ip" | "userAgent">
): Promise<void> {
  try {
    await auditRequest(entry);
  } catch (error) {
    console.error(`[audit] "${entry.action}" yozilmadi:`, error);
  }
}
