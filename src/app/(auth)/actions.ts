"use server";

import { redirect } from "next/navigation";

import { AUDIT, auditSafely, writeAudit } from "@/lib/audit";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { defaultLandingForRole, safeRedirectPath } from "@/lib/auth/redirects";
import {
  createSession,
  revokeAllUserSessions,
  revokeSession,
} from "@/lib/auth/session";
import {
  PASSWORD_RESET_TTL_MINUTES,
  TOKEN_PURPOSE,
  consumeToken,
  issueToken,
  passwordResetLink,
} from "@/lib/auth/verification";
import { db } from "@/lib/db";
import { SessionRevokeReason, UserRole, UserStatus } from "@/lib/enums";
import { env } from "@/lib/env";
import { passwordResetMail, sendMail } from "@/lib/mail";
import { RULES, consume, rateLimitKey, rateLimitMessage, reset } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import { isRegistrationOpen } from "@/lib/settings";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * AUTH SERVER ACTION'LARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UMUMIY QOIDA: XATO XABARI MA'LUMOT BERMASLIGI KERAK
 *
 *  "Bunday email topilmadi" va "Parol xato" — ikki xil xabar berish
 *  hujumchiga qaysi emaillar ro'yxatdan o'tganini aytadi. U shu orqali
 *  mavjud hisoblar ro'yxatini yig'ib, keyin faqat ularga parol taxmin
 *  qiladi.
 *
 *  Shu sababli ikkala holatda ham BIR XIL xabar qaytariladi va parol
 *  tekshiruvi foydalanuvchi topilmagan holatda ham bajariladi (javob
 *  vaqti bir xil bo'lishi uchun).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Ketma-ket muvaffaqiyatsiz urinishdan keyin hisob bloklanadi. */
const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MINUTES = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Kirish
// ─────────────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseFormData(loginSchema, formData);
  const info = await getRequestInfo();

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  const { identifier, password, next } = parsed.data;

  // ── Rate limit ────────────────────────────────────────────────────────
  // IP va identifikator birga: faqat IP bo'lsa umumiy Wi-Fi ortidagi hamma
  // zarar ko'radi, faqat email bo'lsa hujumchi har urinishda boshqa email
  // yozib aylanib o'tadi.
  const limitKey = rateLimitKey("login", {
    ip: info.ip,
    identifier: identifier.value,
  });
  const limit = consume(limitKey, RULES.LOGIN);

  if (!limit.ok) {
    return formError(rateLimitMessage(limit));
  }

  // ── Foydalanuvchini topish ────────────────────────────────────────────
  const user = await db.user.findFirst({
    where:
      identifier.kind === "email"
        ? { email: identifier.value }
        : { phone: identifier.value },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      deletedAt: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  const GENERIC_ERROR = "Email/telefon yoki parol xato.";

  // ── Bloklangan hisob ──────────────────────────────────────────────────
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return formError(
      `Hisob vaqtincha bloklangan. ${minutesLeft} daqiqadan keyin qayta urinib ko'ring.`
    );
  }

  // ── Parolni tekshirish ────────────────────────────────────────────────
  // Foydalanuvchi topilmasa ham chaqiriladi: `verifyPassword` soxta hash
  // bilan solishtirib, javob vaqtini bir xil saqlaydi.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || user.deletedAt || !passwordOk) {
    // Muvaffaqiyatsiz urinishni hisobga olamiz — bu rate limit'dan
    // qo'shimcha qatlam: hujumchi IP almashtirsa ham hisob bloklanadi.
    if (user && !user.deletedAt) {
      const failedCount = user.failedLoginCount + 1;
      const shouldLock = failedCount >= MAX_FAILED_LOGINS;

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
        },
      });

      await auditSafely({
        actorId: user.id,
        action: shouldLock ? AUDIT.ACCOUNT_LOCKED : AUDIT.LOGIN_FAILED,
        entityType: "User",
        entityId: user.id,
        after: { attempt: failedCount, locked: shouldLock },
      });
    }

    return formError(GENERIC_ERROR);
  }

  // ── Hisob holati ──────────────────────────────────────────────────────
  if (user.status === UserStatus.BANNED) {
    return formError(
      "Bu hisob bloklangan. Sabab bo'yicha yordam xizmatiga murojaat qiling."
    );
  }
  if (user.status === UserStatus.SUSPENDED) {
    return formError(
      "Hisob vaqtincha to'xtatilgan. Yordam xizmatiga murojaat qiling."
    );
  }

  // ── Muvaffaqiyatli kirish ─────────────────────────────────────────────
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  // Limit hisobini tozalaymiz — to'g'ri kirgandan keyin oldingi
  // muvaffaqiyatsiz urinishlar ushlab turmasligi kerak.
  reset(limitKey);

  const tokens = await createSession(
    { id: user.id, role: user.role },
    { ip: info.ip, userAgent: info.userAgent }
  );

  await setAuthCookies(tokens);

  await auditSafely({
    actorId: user.id,
    action: AUDIT.LOGIN_SUCCESS,
    entityType: "User",
    entityId: user.id,
    after: { sessionId: tokens.sessionId },
  });

  /**
   * `redirect()` ichkarida xato tashlaydi (Next shunday ishlaydi), shuning
   * uchun u try/catch ICHIDA bo'lmasligi va oxirgi amal bo'lishi kerak.
   */
  redirect(safeRedirectPath(next, defaultLandingForRole(user.role)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Ro'yxatdan o'tish
// ─────────────────────────────────────────────────────────────────────────────

export async function registerAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const info = await getRequestInfo();

  // ── Ro'yxatdan o'tish ochiqmi ─────────────────────────────────────────
  if (!(await isRegistrationOpen())) {
    return formError(
      "Ro'yxatdan o'tish vaqtincha yopilgan. Keyinroq qayta urinib ko'ring."
    );
  }

  const parsed = parseFormData(registerSchema, formData);

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  const { name, email, password, role, referralCode, website } = parsed.data;

  /**
   * Honeypot: `website` maydoni formada YASHIRIN. Odam uni ko'rmaydi,
   * bot esa barcha maydonlarni to'ldiradi.
   *
   * Botga muvaffaqiyat qaytaramiz — xato bersak u boshqa yo'l izlab
   * qayta urinadi. "Hammasi joyida" degan javob uni to'xtatadi.
   */
  if (website && website.trim().length > 0) {
    return { status: "success", message: "Hisob yaratildi." };
  }

  const limitKey = rateLimitKey("register", { ip: info.ip, identifier: email });
  const limit = consume(limitKey, RULES.REGISTER);

  if (!limit.ok) {
    return formError(rateLimitMessage(limit));
  }

  // ── Email band emasmi ─────────────────────────────────────────────────
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // Bu yerda aniq xabar berilishi TO'G'RI: foydalanuvchi o'z emailini
    // kiritayotganini biladi va "bu email band" degan xabar unga kerak.
    // Hisob sanashdan himoya `login` da muhim, ro'yxatdan o'tishda esa
    // bu xabarni yashirsak foydalanuvchi nima bo'layotganini tushunmaydi.
    return {
      status: "error",
      fieldErrors: {
        email: ["Bu email allaqachon ro'yxatdan o'tgan. Kirishga urinib ko'ring."],
      },
    };
  }

  const passwordHash = await hashPassword(password);

  // ── Referal ───────────────────────────────────────────────────────────
  const referrer = referralCode
    ? await db.user.findFirst({
        where: { username: referralCode.trim() },
        select: { id: true },
      })
    : null;

  /**
   * Foydalanuvchi, hamyon, xabarnoma sozlamalari va rolga mos profil —
   * BITTA TRANZAKSIYADA.
   *
   * Nega: yarim yaratilgan hisob eng yomon holat. Foydalanuvchi bor, lekin
   * hamyoni yo'q — u loyihaga to'lov qilishga urinib xato oladi va sababi
   * tushunarsiz bo'ladi.
   */
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        // Email tasdiqlanmagan bo'lsa ham hisob FAOL: platformani ko'rib
        // chiqishga to'sqinlik qilmaymiz. Tasdiqlash pul bilan bog'liq
        // amallardan oldin talab qilinadi.
        status: UserStatus.ACTIVE,
        wallet: { create: { currency: env.DEFAULT_CURRENCY } },
        notificationPref: { create: {} },
        ...(role === UserRole.CUSTOMER
          ? { customerProfile: { create: {} } }
          : { developerProfile: { create: {} } }),
      },
      select: { id: true, email: true, role: true },
    });

    if (referrer) {
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: created.id,
          code: referralCode!.trim(),
        },
      });
    }

    await writeAudit(
      {
        actorId: created.id,
        action: AUDIT.REGISTER,
        entityType: "User",
        entityId: created.id,
        after: { email: created.email, role: created.role, referred: Boolean(referrer) },
        ip: info.ip,
        userAgent: info.userAgent,
      },
      tx
    );

    return created;
  });

  const tokens = await createSession(
    { id: user.id, role: user.role },
    { ip: info.ip, userAgent: info.userAgent }
  );

  await setAuthCookies(tokens);

  /**
   * Developer arizani to'ldirishga yuboriladi, mijoz esa kabinetga.
   *
   * Developer uchun `/dashboard` mantiqsiz: uning profili hali
   * tasdiqlanmagan, ko'rsatadigan narsa yo'q.
   */
  redirect(role === UserRole.DEVELOPER ? "/apply" : "/dashboard");
}

// ─────────────────────────────────────────────────────────────────────────────
// Parolni tiklash — havola so'rash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tiklash havolasini yuboradi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  MUHIM: JAVOB HAR DOIM BIR XIL
 *
 *  Email ro'yxatdan o'tgan bo'lsa ham, o'tmagan bo'lsa ham "havola
 *  yuborildi" deyiladi. Aks holda bu forma hisob sanash vositasiga
 *  aylanadi: hujumchi minglab email kiritib, qaysilari platformada
 *  borligini aniqlab oladi.
 *
 *  Shu sababli `formSuccess` HAR IKKI holatda qaytariladi va farq faqat
 *  serverda (xat yuborildi yoki yo'q) qoladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function forgotPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const info = await getRequestInfo();
  const parsed = parseFormData(forgotPasswordSchema, formData);

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  const { email, website } = parsed.data;

  // Honeypot — botga muvaffaqiyat qaytaramiz.
  if (website && website.trim().length > 0) {
    return formSuccess();
  }

  const limit = consume(
    rateLimitKey("password_reset", { ip: info.ip, identifier: email }),
    RULES.PASSWORD_RESET
  );

  if (!limit.ok) {
    return formError(rateLimitMessage(limit));
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, deletedAt: true, status: true },
  });

  // Foydalanuvchi bor va faol bo'lsa — havola yuboramiz.
  if (user && !user.deletedAt && user.status !== UserStatus.BANNED) {
    const issued = await issueToken({
      identifier: email,
      purpose: TOKEN_PURPOSE.RESET_PASSWORD,
      ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    await sendMail(
      passwordResetMail({
        to: email,
        name: user.name,
        link: passwordResetLink(issued.token),
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      })
    );

    await auditSafely({
      actorId: user.id,
      action: AUDIT.PASSWORD_RESET,
      entityType: "User",
      entityId: user.id,
      after: { stage: "link_requested" },
    });
  }

  return formSuccess();
}

// ─────────────────────────────────────────────────────────────────────────────
// Parolni tiklash — yangi parol o'rnatish
// ─────────────────────────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const info = await getRequestInfo();
  const parsed = parseFormData(resetPasswordSchema, formData);

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  const { token, password } = parsed.data;

  const limit = consume(
    rateLimitKey("password_reset_submit", { ip: info.ip }),
    RULES.PASSWORD_RESET
  );

  if (!limit.ok) {
    return formError(rateLimitMessage(limit));
  }

  // Token shu yerda ISHLATILADI (bir martalik bo'lib qoladi).
  const check = await consumeToken(token, TOKEN_PURPOSE.RESET_PASSWORD);

  if (!check.ok) {
    return formError(
      check.reason === "expired"
        ? "Havola muddati tugagan. Yangi havola so'rang."
        : check.reason === "used"
          ? "Bu havola allaqachon ishlatilgan. Yangi havola so'rang."
          : "Havola yaroqsiz. Yangi havola so'rang."
    );
  }

  const user = await db.user.findUnique({
    where: { email: check.identifier },
    select: { id: true },
  });

  if (!user) {
    // Token amal qilardi, lekin foydalanuvchi o'chirilgan.
    return formError("Hisob topilmadi.");
  }

  const passwordHash = await hashPassword(password);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Parol tiklangach hisob qulfi ham ochiladi — foydalanuvchi
      // aynan shu sababdan parolni tiklagan bo'lishi mumkin.
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  /**
   * BARCHA sessiyalar yopiladi.
   *
   * Bu majburiy: parol tiklanishining sababi ko'pincha uni birov bilib
   * qolgani. Eski sessiyalar tirik qolsa, hujumchi parol o'zgargandan
   * keyin ham hisobda qolib turardi.
   */
  const revoked = await revokeAllUserSessions(
    user.id,
    SessionRevokeReason.PASSWORD_CHANGED
  );

  await auditSafely({
    actorId: user.id,
    action: AUDIT.PASSWORD_RESET,
    entityType: "User",
    entityId: user.id,
    after: { stage: "completed", sessionsRevoked: revoked },
  });

  return formSuccess("Parol o'zgartirildi.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Chiqish
// ─────────────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    await revokeSession(user.sessionId, SessionRevokeReason.LOGOUT);

    await auditSafely({
      actorId: user.id,
      action: AUDIT.LOGOUT,
      entityType: "Session",
      entityId: user.sessionId,
    });
  }

  await clearAuthCookies();

  redirect("/");
}
