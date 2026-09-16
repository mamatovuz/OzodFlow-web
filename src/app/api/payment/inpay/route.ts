import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { PLANS, computePrice, THEME_PRICE, BRANCH_PRICE, type PlanKey } from "@/lib/plans";
import { getPlanPrice, getLifetimePrice } from "@/lib/plan-prices";
import { validatePromo } from "@/lib/promo";
import { getTheme, parsePurchasedThemes } from "@/lib/themes";
import { inpayConfigured, createInpayPayment } from "@/lib/inpay";

// inPAY orqali onlayn to'lovni boshlaydi.
// Body (PLAN):   { kind?: "PLAN", plan, months, lifetime?, promoCode? }
// Body (THEME):  { kind: "THEME", themeKey }
// Body (BRANCH): { kind: "BRANCH" }
// Javob: { payUrl, id } — mijoz payUrl'ga yo'naltiriladi.

const planSchema = z.object({
  kind: z.literal("PLAN").optional(),
  plan: z.enum(["STARTER", "BUSINESS"]),
  months: z.number().int().min(0).max(600),
  lifetime: z.boolean().optional(),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  if (!inpayConfigured()) {
    return fail("Onlayn to'lov hozircha mavjud emas", 503);
  }

  const body = await req.json().catch(() => null);

  // Tasdiqlanmagan (pending) so'rov bo'lsa — yangisini ruxsat bermaymiz
  const pending = await prisma.paymentRequest.findFirst({
    where: { restaurantId: restaurant.id, status: "PENDING" },
  });
  if (pending) {
    return fail("Sizda tugallanmagan to'lov bor. Iltimos, kuting.", 409);
  }

  let kind: "PLAN" | "THEME" | "BRANCH" = "PLAN";
  let plan: PlanKey = restaurant.plan as PlanKey;
  let months = 0;
  let lifetime = false;
  let baseAmount = 0;
  let discount = 0;
  let promoCode: string | null = null;
  let themeKey: string | null = null;
  let description = "";

  if (body?.kind === "THEME") {
    kind = "THEME";
    const theme = getTheme(body.themeKey);
    if (theme.key !== body.themeKey || !theme.premium) {
      return fail("Bu dizayn alohida sotib olinmaydi", 422);
    }
    if (parsePurchasedThemes(restaurant.purchasedThemes).includes(theme.key)) {
      return fail("Bu dizayn allaqachon sizniki", 409);
    }
    themeKey = theme.key;
    lifetime = true;
    baseAmount = THEME_PRICE;
    description = `OzodFlow — ${theme.name} dizayni`;
  } else if (body?.kind === "BRANCH") {
    kind = "BRANCH";
    lifetime = true;
    baseAmount = BRANCH_PRICE;
    description = "OzodFlow — qo'shimcha filial";
  } else {
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
    }
    plan = parsed.data.plan as PlanKey;
    lifetime = !!parsed.data.lifetime;
    months = lifetime ? 0 : parsed.data.months;
    if (!lifetime && months < 1) return fail("Muddatni tanlang", 422);

    const monthly = await getPlanPrice(plan);
    baseAmount = lifetime
      ? await getLifetimePrice(plan)
      : computePrice(monthly, months, lifetime);

    if (parsed.data.promoCode?.trim()) {
      const v = await validatePromo(parsed.data.promoCode, user.id, plan);
      if (!v.valid) return fail(v.reason, 422);
      discount = Math.round((baseAmount * v.discountPercent) / 100);
      promoCode = v.code;
    }
    description = `OzodFlow — ${PLANS[plan].name} ${lifetime ? "(umrbod)" : `(${months} oy)`}`;
  }

  const amount = Math.max(0, baseAmount - discount);
  if (amount < 1000) {
    return fail("To'lov summasi juda kam", 422);
  }

  // 1) So'rovni PENDING holatda yaratamiz
  const request = await prisma.paymentRequest.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      kind,
      plan,
      themeKey,
      months,
      isLifetime: lifetime,
      baseAmount,
      discount,
      promoCode,
      amount,
      receiptImage: "",
      payProvider: "INPAY",
      status: "PENDING",
    },
  });

  // 2) inPAY'da to'lov yaratamiz
  const pay = await createInpayPayment({
    amount,
    description,
    phone: restaurant.phone,
  });

  if (!pay.ok) {
    // Yaratilgan so'rovni tozalaymiz — mijoz qaytadan urinishi mumkin
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
