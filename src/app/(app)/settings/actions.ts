"use server";

import { revalidatePath } from "next/cache";

import {
  accountErrorMessage,
  changeEmail,
  changePassword,
  revokeDevice,
  updateDeveloperProfile,
  updateNotificationPreferences,
  updateProfile,
} from "@/lib/account";
import { authorizeAction } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { RULES, consume, rateLimitKey, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import {
  changeEmailSchema,
  notificationsSchema,
  revokeDeviceSchema,
  updateDeveloperSchema,
  updateProfileSchema,
} from "@/lib/validators/account";
import { changePasswordSchema } from "@/lib/validators/auth";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * SOZLAMALAR — server action'lari
 *
 * Mantiq `src/lib/account.ts` da. Bu yer faqat HTTP chegarasi:
 * huquq → tekshirish → xizmat qatlami.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  RATE LIMIT — bu yerda oddiy formalik emas
 *
 *  Parol va email o'zgartirish HUJUM NISHONI: hisobga bir marta kirgan
 *  odam parolni topish uchun "hozirgi parol" maydonini brute-force
 *  qilishi mumkin. Shuning uchun bu ikki action'da limit qattiqroq.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Parol va email uchun qattiq limit — brute-force'ga qarshi. */
const SENSITIVE_LIMIT = { windowMs: 15 * 60_000, max: 5, blockMs: 30 * 60_000 };

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy profil
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfileAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("profile", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(updateProfileSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await updateProfile(
      auth.user.id,
      {
        name: parsed.data.name,
        username: parsed.data.username,
      },
      { ip: info.ip, userAgent: info.userAgent }
    );
  } catch (error) {
    console.error("[settings.profile]", error);
    return formError(accountErrorMessage(error));
  }

  // Ism sarlavhada va yon panelda ko'rinadi — butun kabinet yangilanadi.
  revalidatePath("/", "layout");

  return formSuccess("Profil saqlandi.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer profili
// ─────────────────────────────────────────────────────────────────────────────

export async function updateDeveloperAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.DEVELOPER);
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("developer_profile", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(updateDeveloperSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await updateDeveloperProfile(auth.user.id, parsed.data);
  } catch (error) {
    console.error("[settings.developer]", error);
    return formError(accountErrorMessage(error));
  }

  revalidatePath("/settings/profile");

  // Ommaviy profil ISR bilan keshlangan — o'zgarish darhol ko'rinishi
  // kerak, aks holda developer "saqlanmadi" deb o'ylaydi.
  if (auth.user.username) {
    revalidatePath(`/dev/${auth.user.username}`);
  }

  return formSuccess("Mutaxassis profili saqlandi.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Parol
// ─────────────────────────────────────────────────────────────────────────────

export async function changePasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("change_password", { ip: info.ip, identifier: auth.user.id }),
    SENSITIVE_LIMIT
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(changePasswordSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  let revokedSessions: number;

  try {
    const result = await changePassword({
      userId: auth.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.password,
      // Hozirgi sessiya qoldiriladi — foydalanuvchi o'zi chiqib
      // qolmasligi kerak.
      keepSessionId: auth.user.sessionId,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revokedSessions = result.revokedSessions;
  } catch (error) {
    console.error("[settings.password]", error);
    return formError(accountErrorMessage(error));
  }

  revalidatePath("/settings/security");

  // Nechta qurilma chiqarilganini AYTAMIZ: foydalanuvchi buni bilishi
  // kerak, aks holda telefonidan chiqib qolgani sirli ko'rinadi.
  return formSuccess(
    revokedSessions > 0
      ? `Parol o'zgartirildi. Boshqa ${revokedSessions} qurilma tizimdan chiqarildi.`
      : "Parol o'zgartirildi."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

export async function changeEmailAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("change_email", { ip: info.ip, identifier: auth.user.id }),
    SENSITIVE_LIMIT
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(changeEmailSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await changeEmail({
      userId: auth.user.id,
      newEmail: parsed.data.email,
      currentPassword: parsed.data.currentPassword,
      ip: info.ip,
      userAgent: info.userAgent,
    });
  } catch (error) {
    console.error("[settings.email]", error);
    return formError(accountErrorMessage(error));
  }

  revalidatePath("/settings/security");

  return formSuccess(
    "Email o'zgartirildi. Yangi manzil hali tasdiqlanmagan."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Qurilmalar
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeDeviceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("revoke_device", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(revokeDeviceSchema, formData);
  if (!parsed.ok) return formError("Qurilma tanlanmadi.");

  // O'z sessiyasini bu yerdan yopish — chiqish tugmasining ishi.
  // Bu yerda ruxsat berilsa foydalanuvchi tasodifan o'zini chiqarib
  // qo'yadi va nima bo'lganini tushunmaydi.
  if (parsed.data.sessionId === auth.user.sessionId) {
    return formError(
      "Bu joriy qurilma. Undan chiqish uchun \"Chiqish\" tugmasini bosing."
    );
  }

  try {
    await revokeDevice({
      userId: auth.user.id,
      sessionId: parsed.data.sessionId,
    });
  } catch (error) {
    console.error("[settings.revokeDevice]", error);
    return formError(accountErrorMessage(error));
  }

  revalidatePath("/settings/security");

  return formSuccess("Qurilma tizimdan chiqarildi.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Xabarnomalar
// ─────────────────────────────────────────────────────────────────────────────

export async function updateNotificationsAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return formError(auth.error);

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey("notifications", { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );
  if (!limit.ok) return formError(rateLimitMessage(limit));

  const parsed = parseFormData(notificationsSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await updateNotificationPreferences(auth.user.id, parsed.data);
  } catch (error) {
    console.error("[settings.notifications]", error);
    return formError(accountErrorMessage(error));
  }

  revalidatePath("/settings/notifications");

  return formSuccess("Xabarnoma sozlamalari saqlandi.");
}
