import { db } from "@/lib/db";
import { hashRefreshToken } from "@/lib/auth/tokens";
import { OtpPurpose } from "@/lib/enums";
import { SITE } from "@/lib/site";

/**
 * HAVOLA ORQALI TASDIQLASH TOKENLARI
 *
 * Parolni tiklash va emailni tasdiqlash uchun bir martalik tokenlar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  XAVFSIZLIK QARORLARI
 *
 *  1. Token databaseda XOM HOLDA SAQLANMAYDI — faqat HMAC hash.
 *     Database o'qib olingan hujumchi tokenlarni tiklab, istalgan
 *     hisobning parolini o'zgartirib qo'yardi.
 *
 *  2. Token bir martalik: ishlatilgach `consumedAt` qo'yiladi.
 *     Havola emailda qoladi va keyin qayta bosilishi mumkin — ikkinchi
 *     marta ishlashi kerak emas.
 *
 *  3. Yangi token so'ralganda AVVALGILARI bekor qilinadi.
 *     Aks holda bir necha amal qiladigan havola paydo bo'ladi va
 *     eng eskisi ham ishlab turadi.
 *
 *  4. Muddat qisqa: 60 daqiqa. Parol tiklash havolasi emailda uzoq
 *     yashamasligi kerak.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const PASSWORD_RESET_TTL_MINUTES = 60;
export const EMAIL_VERIFY_TTL_MINUTES = 60 * 24;

/**
 * Tasodifiy token yasaydi: 32 bayt, base64url.
 *
 * `generateRefreshToken` bilan bir xil kuchda, lekin alohida funksiya —
 * ikkalasining maqsadi boshqa va kelajakda uzunligi farq qilishi mumkin.
 */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type IssuedToken = {
  /** Xom token — FAQAT havolaga qo'yish uchun, saqlanmaydi */
  token: string;
  expiresAt: Date;
};

/**
 * Yangi token yaratadi va o'sha maqsad uchun avvalgilarini bekor qiladi.
 */
export async function issueToken(params: {
  identifier: string;
  purpose: string;
  ttlMinutes: number;
}): Promise<IssuedToken> {
  const token = generateToken();
  const tokenHash = await hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + params.ttlMinutes * 60_000);

  await db.$transaction(async (tx) => {
    // Avvalgi ishlatilmagan tokenlarni bekor qilamiz.
    await tx.verificationToken.updateMany({
      where: {
        identifier: params.identifier,
        purpose: params.purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    await tx.verificationToken.create({
      data: {
        identifier: params.identifier,
        purpose: params.purpose,
        tokenHash,
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

export type TokenCheck =
  | { ok: true; identifier: string }
  | { ok: false; reason: "not_found" | "expired" | "used" };

/**
 * Tokenni tekshiradi va ISHLATILGAN deb belgilaydi.
 *
 * Tekshirish va belgilash BITTA TRANZAKSIYADA: aks holda bir vaqtda
 * kelgan ikki so'rov ikkalasi ham "to'g'ri" javobini olib, parolni ikki
 * marta o'zgartirishga urinishi mumkin.
 */
export async function consumeToken(
  token: string,
  purpose: string
): Promise<TokenCheck> {
  const tokenHash = await hashRefreshToken(token);

  return db.$transaction(async (tx) => {
    const record = await tx.verificationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        identifier: true,
        purpose: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!record || record.purpose !== purpose) {
      return { ok: false as const, reason: "not_found" as const };
    }

    if (record.consumedAt) {
      return { ok: false as const, reason: "used" as const };
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      return { ok: false as const, reason: "expired" as const };
    }

    await tx.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return { ok: true as const, identifier: record.identifier };
  });
}

/**
 * Tokenni FOYDALANMASDAN tekshiradi.
 *
 * Parolni tiklash sahifasini ochishda kerak: havola yaroqli ekanini
 * ko'rsatish uchun. Tokenni o'sha zahoti ishlatib yuborsak, foydalanuvchi
 * formani to'ldirib bo'lgach u yaroqsiz bo'lib qolardi.
 */
export async function inspectToken(
  token: string,
  purpose: string
): Promise<TokenCheck> {
  const tokenHash = await hashRefreshToken(token);

  const record = await db.verificationToken.findUnique({
    where: { tokenHash },
    select: { identifier: true, purpose: true, expiresAt: true, consumedAt: true },
  });

  if (!record || record.purpose !== purpose) {
    return { ok: false, reason: "not_found" };
  }
  if (record.consumedAt) return { ok: false, reason: "used" };
  if (record.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, identifier: record.identifier };
}

/** Parolni tiklash havolasi. */
export function passwordResetLink(token: string): string {
  return `${SITE.url}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Emailni tasdiqlash havolasi. */
export function emailVerifyLink(token: string): string {
  return `${SITE.url}/verify-email?token=${encodeURIComponent(token)}`;
}

export const TOKEN_PURPOSE = {
  RESET_PASSWORD: OtpPurpose.RESET_PASSWORD,
  VERIFY_EMAIL: OtpPurpose.VERIFY_EMAIL,
} as const;

/**
 * Muddati o'tgan tokenlarni tozalaydi.
 *
 * Jadval o'sib ketmasligi uchun. Reja bo'yicha chaqiriladi.
 */
export async function pruneTokens(olderThanDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);

  const result = await db.verificationToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { consumedAt: { lt: cutoff } }] },
  });

  return result.count;
}
