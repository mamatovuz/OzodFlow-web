"use server";

import { revalidatePath } from "next/cache";

import { authorizeAction } from "@/lib/auth/current-user";
import { UserRole } from "@/lib/enums";
import {
  addPortfolioItem,
  addSkill,
  deletePortfolioItem,
  movePortfolioItem,
  portfolioErrorMessage,
  removeSkill,
  setPortfolioVisibility,
  updatePortfolioItem,
} from "@/lib/portfolio";
import { RULES, consume, rateLimitKey, rateLimitMessage } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";
import {
  addSkillSchema,
  editPortfolioItemSchema,
  portfolioItemIdSchema,
  portfolioItemSchema,
  portfolioMoveSchema,
  portfolioVisibilitySchema,
  removeSkillSchema,
} from "@/lib/validators/portfolio";
import {
  formError,
  formSuccess,
  parseFormData,
  type FormState,
} from "@/lib/validators/form";

/**
 * PORTFOLIO VA KO'NIKMALAR — server action'lari
 *
 * Mantiq `src/lib/portfolio.ts` da, egalik tekshiruvi ham shu yerda.
 * Bu qatlam faqat HTTP chegarasi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  KESHNI YANGILASH
 *
 *  Har o'zgarishdan keyin IKKI yo'l yangilanadi:
 *    • /settings/portfolio — tahrirlash sahifasi
 *    • /dev/{username}     — ommaviy profil (ISR bilan keshlangan)
 *
 *  Ikkinchisi shart: aks holda developer ishni qo'shadi, ommaviy
 *  profilga qaraydi va uni ko'rmaydi — "saqlanmadi" deb o'ylaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** O'zgarishdan keyin keshni yangilaydi. */
function revalidateProfile(username: string | null): void {
  revalidatePath("/settings/portfolio");
  if (username) revalidatePath(`/dev/${username}`);
}

/** Umumiy tekshiruv: developer + rate limit. */
async function authorizePortfolioAction(action: string) {
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
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export async function addPortfolioAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("portfolio_add");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(portfolioItemSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await addPortfolioItem(auth.user.id, parsed.data);
  } catch (error) {
    console.error("[portfolio.add]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess("Ish qo'shildi.");
}

export async function updatePortfolioAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("portfolio_edit");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(editPortfolioItemSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  const { itemId, ...input } = parsed.data;

  try {
    await updatePortfolioItem({ userId: auth.user.id, itemId, input });
  } catch (error) {
    console.error("[portfolio.update]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess("Saqlandi.");
}

export async function deletePortfolioAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("portfolio_delete");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(portfolioItemIdSchema, formData);
  if (!parsed.ok) return formError("Ish tanlanmadi.");

  try {
    await deletePortfolioItem({
      userId: auth.user.id,
      itemId: parsed.data.itemId,
    });
  } catch (error) {
    console.error("[portfolio.delete]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess("Ish o'chirildi.");
}

export async function togglePortfolioVisibilityAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("portfolio_visibility");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(portfolioVisibilitySchema, formData);
  if (!parsed.ok) return formError("Amal aniqlanmadi.");

  const isVisible = parsed.data.visible === "show";

  try {
    await setPortfolioVisibility({
      userId: auth.user.id,
      itemId: parsed.data.itemId,
      isVisible,
    });
  } catch (error) {
    console.error("[portfolio.visibility]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess(
    isVisible ? "Ish profilda ko'rinadi." : "Ish yashirildi."
  );
}

export async function movePortfolioAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("portfolio_move");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(portfolioMoveSchema, formData);
  if (!parsed.ok) return formError("Amal aniqlanmadi.");

  try {
    await movePortfolioItem({
      userId: auth.user.id,
      itemId: parsed.data.itemId,
      direction: parsed.data.direction,
    });
  } catch (error) {
    console.error("[portfolio.move]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  // Xabar YO'Q: tartib o'zgargani ro'yxatning o'zidan ko'rinadi va
  // har bosishda "Saqlandi" chiqishi bezor qiladi.
  return formSuccess();
}

// ─────────────────────────────────────────────────────────────────────────────
// Ko'nikmalar
// ─────────────────────────────────────────────────────────────────────────────

export async function addSkillAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("skill_add");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(addSkillSchema, formData);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await addSkill({
      userId: auth.user.id,
      skillId: parsed.data.skillId,
      level: parsed.data.level,
      yearsExperience: parsed.data.yearsExperience,
    });
  } catch (error) {
    console.error("[skill.add]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess("Ko'nikma qo'shildi.");
}

export async function removeSkillAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const auth = await authorizePortfolioAction("skill_remove");
  if (!auth.ok) return formError(auth.error);

  const parsed = parseFormData(removeSkillSchema, formData);
  if (!parsed.ok) return formError("Ko'nikma tanlanmadi.");

  try {
    await removeSkill({ userId: auth.user.id, skillId: parsed.data.skillId });
  } catch (error) {
    console.error("[skill.remove]", error);
    return formError(portfolioErrorMessage(error));
  }

  revalidateProfile(auth.user.username);

  return formSuccess("Ko'nikma olib tashlandi.");
}
