import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { waiterSchema } from "@/lib/validation";

// Ofitsantlar ro'yxati
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const waiters = await prisma.waiter.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(waiters);
}

// Yangi ofitsant qo'shish
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = waiterSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }
  const code = parsed.data.code.trim();

  // Kod restoran ichida takrorlanmasligi kerak
  const exists = await prisma.waiter.findFirst({
    where: { restaurantId: restaurant.id, code },
  });
  if (exists) return fail("Bu kod band — boshqasini tanlang", 409);

  const waiter = await prisma.waiter.create({
    data: {
      restaurantId: restaurant.id,
      name: parsed.data.name.trim(),
      lastName: parsed.data.lastName?.trim() || null,
      age: parsed.data.age ?? null,
      code,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return ok(waiter, 201);
}
