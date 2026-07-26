"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applicationErrorMessage,
  gradeTest,
  saveApplication,
  startTest,
  submitApplication,
} from "@/lib/application";
import { authorizeAction } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import { RULES, consume, rateLimitKey, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import {
  applicationSchema,
  parseTestAnswers,
} from "@/lib/validators/application";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * MUTAXASSIS ARIZASI — server action'lari
 *
 * Mantiq `src/lib/application.ts` da. Bu qatlam faqat HTTP chegarasi.
 */

/** Umumiy tekshiruv: developer + rate limit. */
async function authorizeApply(action: string) {
  const auth = await authorizeAction(UserRole.DEVELOPER);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const info = await getRequestInfo();
  const limit = consume(
    rateLimitKey(action, { ip: info.ip, identifier: auth.user.id }),
    RULES.WRITE
  );

  if (!limit.ok) {
    return { ok: false as const, error: rateLimitMessage(limit) };
  }

  return { ok: true as const, user: auth.user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ariza ma'lumotlari
// ─────────────────────────────────────────────────────────────────────────────

export async function saveApplicationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeApply("application_save");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(applicationSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await saveApplication({ userId: auth.user.id, input: parsed.data });
  } catch (error) {
    console.error("[apply.save]", error);
    return formError(applicationErrorMessage(error));
  }

  revalidatePath("/apply");

  return formSuccess("Saqlandi. Yuborishga tayyor bo'lganda tugmani bosing.");
}

/**
 * Arizani ko'rikka yuboradi.
 *
 * Muvaffaqiyatda holat sahifasiga YO'NALTIRAMIZ: ariza yuborilgach
 * forma boshqa kerak emas va uni ekranda qoldirish "yana yuborsammi?"
 * degan savol tug'diradi.
 */
export async function submitApplicationAction(
  _prevState: FormState,
  _formData: FormData
): Promise<FormState> {
  const auth = await authorizeApply("application_submit");
  if (!auth.ok) return formError(auth.error);

  try {
    await submitApplication(auth.user.id);
  } catch (error) {
    console.error("[apply.submit]", error);
    return formError(applicationErrorMessage(error));
  }

  revalidatePath("/apply");
  revalidatePath("/apply/status");

  // `redirect` try/catch TASHQARISIDA: Next uni xato tashlash orqali
  // amalga oshiradi.
  redirect("/apply/status");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export type TestStartResult = { endsAtIso: string };

export async function startTestAction(
  _prevState: FormState<TestStartResult>,
  _formData: FormData
): Promise<FormState<TestStartResult>> {
  const auth = await authorizeApply("test_start");
  if (!auth.ok) return formError(auth.error);

  try {
    const { endsAt } = await startTest(auth.user.id);

    revalidatePath("/apply/test");

    // ISO matn qaytariladi: `Date` obyekti klientga o'zgarishsiz
    // uzatilmaydi.
    return formSuccess(undefined, { endsAtIso: endsAt.toISOString() });
  } catch (error) {
    console.error("[apply.testStart]", error);
    return formError(applicationErrorMessage(error));
  }
}

export async function submitTestAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizeApply("test_submit");
  if (!auth.ok) return formError(auth.error);

  const answers = parseTestAnswers(formData);

  if (Object.keys(answers).length === 0) {
    return formError("Hech bo'lmasa bitta savolga javob bering.");
  }

  try {
    await gradeTest({ userId: auth.user.id, answers });
  } catch (error) {
    console.error("[apply.testSubmit]", error);
    return formError(applicationErrorMessage(error));
  }

  revalidatePath("/apply/status");

  redirect("/apply/status");
}
