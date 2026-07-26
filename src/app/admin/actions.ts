"use server";

import { revalidatePath } from "next/cache";

import { authorizeAction } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { formatMoney } from "@/lib/money";
import { confirmDeposit, rejectDeposit } from "@/lib/payments";
import { moderateProject, projectErrorMessage } from "@/lib/projects";
import { getRequestInfo } from "@/lib/request-info";
import { formError, formSuccess, type FormState } from "@/lib/validators/form";

/**
 * ADMIN AMALLARI
 *
 * Har biri `authorizeAction(UserRole.ADMIN)` bilan boshlanadi.
 *
 * Bu TAKRORLASH EMAS: middleware va admin layout ham tekshiradi, lekin
 * server action alohida HTTP endpoint — uni sahifani ochmasdan ham
 * chaqirish mumkin. Shuning uchun har action o'z huquqini o'zi
 * tekshirishi shart.
 */

// ─────────────────────────────────────────────────────────────────────────────
// To'lovlar
// ─────────────────────────────────────────────────────────────────────────────

export async function confirmDepositAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.ADMIN);
  if (!auth.ok) return formError(auth.error);

  const paymentId = String(formData.get("paymentId") || "");
  if (!paymentId) return formError("To'lov ko'rsatilmagan.");

  const info = await getRequestInfo();

  try {
    const result = await confirmDeposit({
      paymentId,
      adminId: auth.user.id,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin");

    return formSuccess(
      `${formatMoney(result.amount)} hamyonga qo'shildi.`
    );
  } catch (error) {
    console.error("[admin.confirmDeposit]", error);
    return formError(
      error instanceof Error && error.name === "PaymentError"
        ? error.message
        : "To'lovni tasdiqlab bo'lmadi."
    );
  }
}

export async function rejectDepositAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.ADMIN);
  if (!auth.ok) return formError(auth.error);

  const paymentId = String(formData.get("paymentId") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!paymentId) return formError("To'lov ko'rsatilmagan.");
  if (reason.length < 5) {
    return formError("Rad etish sababini yozing (kamida 5 belgi).");
  }

  const info = await getRequestInfo();

  try {
    await rejectDeposit({
      paymentId,
      adminId: auth.user.id,
      reason,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin");

    return formSuccess("To'lov rad etildi.");
  } catch (error) {
    console.error("[admin.rejectDeposit]", error);
    return formError("To'lovni rad etib bo'lmadi.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutaxassisni tasdiqlash
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyDeveloperAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.ADMIN);
  if (!auth.ok) return formError(auth.error);

  const userId = String(formData.get("userId") || "");
  if (!userId) return formError("Foydalanuvchi ko'rsatilmagan.");

  const info = await getRequestInfo();

  try {
    const { verifyDeveloper } = await import("@/lib/developers");

    const result = await verifyDeveloper({
      userId,
      adminId: auth.user.id,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/admin/users");
    revalidatePath("/developers");

    return formSuccess(
      `Tasdiqlandi. Ommaviy profil: /dev/${result.username}`
    );
  } catch (error) {
    console.error("[admin.verifyDeveloper]", error);
    return formError(
      error instanceof Error && error.name === "DeveloperError"
        ? error.message
        : "Tasdiqlab bo'lmadi."
    );
  }
}

export async function unverifyDeveloperAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.ADMIN);
  if (!auth.ok) return formError(auth.error);

  const userId = String(formData.get("userId") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!userId) return formError("Foydalanuvchi ko'rsatilmagan.");
  if (reason.length < 5) return formError("Sababni yozing (kamida 5 belgi).");

  const info = await getRequestInfo();

  try {
    const { unverifyDeveloper } = await import("@/lib/developers");

    await unverifyDeveloper({
      userId,
      adminId: auth.user.id,
      reason,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/admin/users");
    revalidatePath("/developers");

    return formSuccess("Tasdiq bekor qilindi.");
  } catch (error) {
    console.error("[admin.unverifyDeveloper]", error);
    return formError("Bekor qilib bo'lmadi.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loyiha moderatsiyasi
// ─────────────────────────────────────────────────────────────────────────────

export async function moderateProjectAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeAction(UserRole.ADMIN);
  if (!auth.ok) return formError(auth.error);

  const projectId = String(formData.get("projectId") || "");
  const decision = String(formData.get("decision") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!projectId) return formError("Loyiha ko'rsatilmagan.");
  if (decision !== "approve" && decision !== "reject") {
    return formError("Qaror ko'rsatilmagan.");
  }

  // Rad etishda sabab MAJBURIY: mijoz nimani tuzatish kerakligini
  // bilmasa, xuddi shu loyihani qayta joylashtiradi.
  if (decision === "reject" && reason.length < 10) {
    return formError("Rad etish sababini yozing (kamida 10 belgi).");
  }

  const info = await getRequestInfo();

  try {
    await moderateProject({
      projectId,
      adminId: auth.user.id,
      approve: decision === "approve",
      reason: reason || undefined,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    revalidatePath("/admin/moderation");
    revalidatePath("/admin");
    revalidatePath("/projects");

    return formSuccess(
      decision === "approve"
        ? "Loyiha tasdiqlandi va ochiq ro'yxatga chiqdi."
        : "Loyiha rad etildi."
    );
  } catch (error) {
    console.error("[admin.moderateProject]", error);
    return formError(projectErrorMessage(error));
  }
}
