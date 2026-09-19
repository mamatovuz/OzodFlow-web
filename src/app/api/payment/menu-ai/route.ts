import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { inpayConfigured, createInpayPayment } from "@/lib/inpay";
import { MENU_AI_PRICE_SOM } from "@/lib/menu-ai-plan";

export const dynamic = "force-dynamic";

// Menyu AI oylik obunasini inPAY orqali to'lash.
// Javob: { payUrl, id } — mijoz payUrl'ga yo'naltiriladi.
export async function POST(_req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  if (!inpayConfigured()) return fail("Onlayn to'lov hozircha mavjud emas", 503);

  // Tugallanmagan to'lov bo'lsa — yangisini ruxsat bermaymiz
  const pending = await prisma.paymentRequest.findFirst({
    where: { restaurantId: restaurant.id, status: "PENDING" },
  });
  if (pending) return fail("Sizda tugallanmagan to'lov bor. Iltimos, kuting.", 409);

  const amount = MENU_AI_PRICE_SOM;

  // 1) So'rovni PENDING holatda yaratamiz
  const request = await prisma.paymentRequest.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      kind: "MENU_AI",
      plan: restaurant.plan, // joriy tarif (MENU_AI uchun ahamiyatsiz, lekin maydon shart)
      months: 1,
      isLifetime: false,
      baseAmount: amount,
      discount: 0,
      amount,
      receiptImage: "",
      payProvider: "INPAY",
      status: "PENDING",
    },
  });

  // 2) inPAY'da to'lov yaratamiz
  const pay = await createInpayPayment({
    amount,
    description: "OzodFlow — AI menyu yordamchisi (1 oy)",
    phone: restaurant.phone,
  });
  if (!pay.ok) {
    await prisma.paymentRequest.delete({ where: { id: request.id } }).catch(() => {});
    return fail(pay.error || "To'lov yaratilmadi", 502);
  }

  // 3) order_id + pay_url ni saqlaymiz
  await prisma.paymentRequest.update({
    where: { id: request.id },
    data: { payOrderId: pay.orderId, payUrl: pay.payUrl },
  });

  return ok({ id: request.id, payUrl: pay.payUrl, amount }, 201);
}
