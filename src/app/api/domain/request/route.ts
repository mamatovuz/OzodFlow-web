import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

const schema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, "Domen noto'g'ri (masalan: menu.restoran.uz)"),
  note: z.string().optional(),
  receiptImage: z.string().optional(),
});

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const requests = await prisma.domainRequest.findMany({
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

  // Domen ulash endi barcha tariflarda mavjud (admin 40 000 so'm/yil o'rnatib beradi).

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  // Kutilayotgan so'rov bo'lsa yangisiga yo'l qo'ymaymiz
  const pending = await prisma.domainRequest.findFirst({
    where: { restaurantId: restaurant.id, status: "PENDING" },
  });
  if (pending) {
    return fail("Sizda ko'rib chiqilmagan domen so'rovi bor.", 409);
  }

  // Domen band emasligini tekshirish
  const taken = await prisma.restaurant.findFirst({
    where: { customDomain: parsed.data.domain, NOT: { id: restaurant.id } },
  });
  if (taken) return fail("Bu domen allaqachon band", 409);

  const request = await prisma.domainRequest.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      domain: parsed.data.domain,
      note: parsed.data.note || null,
      receiptImage: parsed.data.receiptImage || null,
      status: "PENDING",
    },
  });

  return ok({ id: request.id }, 201);
}
