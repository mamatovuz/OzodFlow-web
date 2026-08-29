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
  // Amal qilish muddati o'tganmi?
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "Kod muddati tugagan" };
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

  // "N oyda 1 marta" — foydalanuvchi shu kodni yaqinda (N oy ichida) ishlatganmi?
  if (promo.perUserMonths && promo.perUserMonths > 0) {
    const since = new Date();
    since.setMonth(since.getMonth() - promo.perUserMonths);
    const recent = await prisma.paymentRequest.findFirst({
      where: {
        userId,
        promoCode: normalized,
        status: "APPROVED",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (recent) {
      return {
        valid: false,
        reason: `Bu kodni har ${promo.perUserMonths} oyda 1 marta ishlatish mumkin`,
      };
    }
  }

  return { valid: true, discountPercent: promo.discountPercent, code: normalized };
}

export function randomPromoCode(prefix = "OZOD") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}
