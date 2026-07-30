import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(tables);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  if (!name) return fail("Stol nomini kiriting", 422);

  // Noyob kod
  let code = randomCode(6);
  while (await prisma.restaurantTable.findUnique({ where: { code } })) {
    code = randomCode(6);
  }

  const table = await prisma.restaurantTable.create({
    data: { restaurantId: restaurant.id, name, code },
  });
  return ok(table, 201);
}
