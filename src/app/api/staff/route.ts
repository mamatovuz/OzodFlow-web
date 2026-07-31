import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/plans";

const schema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgi"),
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
  role: z.enum(["MANAGER", "OPERATOR", "CASHIER", "KITCHEN", "WAITER"]),
});

// Faqat restoran egasining o'z restorani
async function ownedRestaurant(userId: string) {
  return prisma.restaurant.findFirst({ where: { ownerId: userId } });
}

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await ownedRestaurant(user.id);
  if (!restaurant) return fail("Faqat restoran egasi xodim boshqaradi", 403);

  const staff = await prisma.membership.findMany({
    where: { restaurantId: restaurant.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return ok(staff);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await ownedRestaurant(user.id);
  if (!restaurant) return fail("Faqat restoran egasi xodim qo'sha oladi", 403);

  // Xodimlar Pro va yuqori tariflarda
  const access = getEffectivePlan(restaurant);
  if (!access.canStaff) {
    return fail("Xodimlar tizimi Pro va Business tariflarida mavjud", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("Bu email allaqachon ishlatilgan", 409);

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      password: await hashPassword(parsed.data.password),
      role: "STAFF",
      memberships: {
        create: { restaurantId: restaurant.id, role: parsed.data.role },
      },
    },
  });
  return ok({ id: created.id }, 201);
}
