import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { PLANS, computePrice, type PlanKey } from "@/lib/plans";
import { getPlanPrice } from "@/lib/plan-prices";
import { validatePromo } from "@/lib/promo";

const schema = z.object({
  plan: z.enum(["PRO", "PROMAX"]),
  months: z.number().int().min(0).max(600),
  lifetime: z.boolean().optional(),
  promoCode: z.string().optional(),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const pending = await prisma.paymentRequest.findFirst({
    where: { restaurantId: restaurant.id, status: "PENDING" },
  });
  if (pending) {
    return fail("Sizda tasdiqlanmagan to'lov so'rovi bor. Iltimos, kuting.", 409);
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
