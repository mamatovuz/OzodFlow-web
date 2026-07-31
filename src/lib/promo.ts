import { prisma } from "./prisma";

export type PromoResult =
  | { valid: true; discountPercent: number; code: string }
  | { valid: false; reason: string };

// Promo kodni tekshiradi (mijoz + tarif uchun)
export async function validatePromo(
  code: string,
  userId: string,
  plan: string
): Promise<PromoResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "Kod kiriting" };

  const promo = await prisma.promoCode.findUnique({ where: { code: normalized } });
  if (!promo || !promo.isActive) {
    return { valid: false, reason: "Kod topilmadi yoki faol emas" };
  }
  if (promo.scope !== "ALL" && promo.scope !== plan) {
    return { valid: false, reason: "Bu kod boshqa tarif uchun" };
  }
  if (promo.source === "USER" && promo.ownerId !== userId) {
    return { valid: false, reason: "Bu kod sizga tegishli emas" };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { valid: false, reason: "Kod ishlatib bo'lingan" };
  }

  return { valid: true, discountPercent: promo.discountPercent, code: normalized };
}

export function randomPromoCode(prefix = "OZOD") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}
