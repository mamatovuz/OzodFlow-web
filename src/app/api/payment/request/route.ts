import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { PLANS, type PlanKey } from "@/lib/plans";

const schema = z.object({
  plan: z.enum(["PRO", "PROMAX"]),
  receiptImage: z.string().min(1, "Chek rasmini yuklang"),
});

// Foydalanuvchining to'lov so'rovlari
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

// Yangi to'lov so'rovi (bir martalik to'lov, chek bilan)
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
  const amount = PLANS[plan].price;

  const request = await prisma.paymentRequest.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      plan,
      months: 0, // bir martalik — umrbod
      amount,
      receiptImage: parsed.data.receiptImage,
      status: "PENDING",
    },
  });

  return ok({ id: request.id, planName: PLANS[plan].name }, 201);
}
