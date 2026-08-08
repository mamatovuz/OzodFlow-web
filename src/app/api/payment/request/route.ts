import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { PLANS, computePrice, THEME_PRICE, type PlanKey } from "@/lib/plans";
import { getPlanPrice } from "@/lib/plan-prices";
import { validatePromo } from "@/lib/promo";
import { getTheme, parsePurchasedThemes } from "@/lib/themes";

const planSchema = z.object({
  kind: z.literal("PLAN").optional(),
  plan: z.enum(["STARTER", "BUSINESS"]),
  months: z.number().int().min(0).max(600),
  lifetime: z.boolean().optional(),
  promoCode: z.string().optional(),
  receiptImage: z.string().min(1, "Chek rasmini yuklang"),
});

const themeSchema = z.object({
  kind: z.literal("THEME"),
  themeKey: z.string().min(1),
  receiptImage: z.string().min(1, "Chek rasmini yuklang"),
});

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const requests = await prisma.paymentRequest.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(requests);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);

  const pending = await prisma.paymentRequest.findFirst({
    where: { restaurantId: restaurant.id, status: "PENDING" },
  });
  if (pending) {
    return fail("Sizda tasdiqlanmagan to'lov so'rovi bor. Iltimos, kuting.", 409);
  }

  // ── Alohida premium dizayn sotib olish (50 000 so'm, umrbod) ──
  if (body?.kind === "THEME") {
    const t = themeSchema.safeParse(body);
    if (!t.success) {
      return fail("Ma'lumotlar noto'g'ri", 422, t.error.flatten().fieldErrors);
    }
    const theme = getTheme(t.data.themeKey);
    if (theme.key !== t.data.themeKey || !theme.premium) {
      return fail("Bu dizayn alohida sotib olinmaydi", 422);
    }
    const purchased = parsePurchasedThemes(restaurant.purchasedThemes);
    if (purchased.includes(theme.key)) {
      return fail("Bu dizayn allaqachon sizniki", 409);
    }

    const request = await prisma.paymentRequest.create({
      data: {
        restaurantId: restaurant.id,
        userId: user.id,
        kind: "THEME",
        plan: restaurant.plan, // joriy tarif (ma'lumot uchun)
        themeKey: theme.key,
        months: 0,
        isLifetime: true,
        baseAmount: THEME_PRICE,
        discount: 0,
        amount: THEME_PRICE,
        receiptImage: t.data.receiptImage,
        status: "PENDING",
      },
    });
    return ok({ id: request.id, themeName: theme.name, amount: THEME_PRICE }, 201);
  }

  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const plan = parsed.data.plan as PlanKey;
  const lifetime = !!parsed.data.lifetime;
  const months = lifetime ? 0 : parsed.data.months;
  if (!lifetime && months < 1) return fail("Muddatni tanlang", 422);

  const monthly = await getPlanPrice(plan);
  const baseAmount = computePrice(monthly, months, lifetime);

  // Promo kod
  let discount = 0;
  let promoCode: string | null = null;
  if (parsed.data.promoCode?.trim()) {
    const v = await validatePromo(parsed.data.promoCode, user.id, plan);
    if (!v.valid) return fail(v.reason, 422);
    discount = Math.round((baseAmount * v.discountPercent) / 100);
    promoCode = v.code;
  }

  const amount = Math.max(0, baseAmount - discount);

  const request = await prisma.paymentRequest.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      plan,
      months,
      isLifetime: lifetime,
      baseAmount,
      discount,
      promoCode,
      amount,
      receiptImage: parsed.data.receiptImage,
      status: "PENDING",
    },
  });

  return ok({ id: request.id, planName: PLANS[plan].name, amount }, 201);
}
