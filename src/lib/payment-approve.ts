import { prisma } from "./prisma";
import { PLAN_DAYS, type PlanKey } from "./plans";
import { parsePurchasedThemes } from "./themes";
import { MENU_AI_DAYS } from "./menu-ai-plan";
import type { PaymentRequest } from "@prisma/client";

// To'langan so'rovni qo'llaydi: tarifni/dizaynni/filialni faollashtiradi va
// so'rovni APPROVED qiladi. Admin tasdig'i va inPAY webhook — ikkalasi shu
// funksiyadan foydalanadi (bir xil natija).
//
// Idempotent: so'rov PENDING bo'lmasa hech narsa qilmaydi.
export async function applyApprovedPayment(
  request: PaymentRequest,
  note?: string | null
): Promise<void> {
  if (request.status !== "PENDING") return;

  // ── Alohida premium dizayn ──
  if (request.kind === "THEME" && request.themeKey) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      select: { purchasedThemes: true },
    });
    const owned = parsePurchasedThemes(restaurant?.purchasedThemes);
    if (!owned.includes(request.themeKey)) owned.push(request.themeKey);
    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: request.restaurantId },
        data: { purchasedThemes: JSON.stringify(owned) },
      }),
      prisma.paymentRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
      }),
    ]);
    return;
  }

  // ── Menyu AI oylik obunasi ──
  if (request.kind === "MENU_AI") {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      select: { menuAiPaidUntil: true },
    });
    const now = new Date();
    const current = restaurant?.menuAiPaidUntil ? new Date(restaurant.menuAiPaidUntil) : null;
    const base = current && current > now ? current : now;
    const paidUntil = new Date(base.getTime() + request.months * MENU_AI_DAYS * 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: request.restaurantId },
        // To'lagach: obuna muddati uzaytiriladi va bepul kvota hisoblagichi nolga tushadi
        data: { menuAiPaidUntil: paidUntil, menuAiUsed: 0 },
      }),
      prisma.paymentRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
      }),
    ]);
    return;
  }

  // ── Qo'shimcha filial ──
  if (request.kind === "BRANCH") {
    await prisma.paymentRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
    });
    return;
  }

  // ── Tarif (PLAN) ──
  const plan = request.plan as PlanKey;
  const now = new Date();
  let planUntil: Date | null;
  if (request.isLifetime) {
    planUntil = null; // umrbod
  } else {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      select: { planUntil: true, plan: true },
    });
    const current = restaurant?.planUntil ? new Date(restaurant.planUntil) : null;
    const base = current && current > now && restaurant?.plan === plan ? current : now;
    planUntil = new Date(base.getTime() + request.months * PLAN_DAYS * 24 * 60 * 60 * 1000);
  }

  const ops = [
    prisma.restaurant.update({
      where: { id: request.restaurantId },
      data: { plan, planUntil },
    }),
    prisma.paymentRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", adminNote: note || null, reviewedAt: new Date() },
    }),
  ];
  if (request.promoCode) {
    ops.push(
      prisma.promoCode.updateMany({
        where: { code: request.promoCode },
        data: { usedCount: { increment: 1 } },
      }) as never
    );
  }
  await prisma.$transaction(ops);
}
