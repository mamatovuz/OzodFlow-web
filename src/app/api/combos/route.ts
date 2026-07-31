import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const combos = await prisma.combo.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
  });
  return ok(combos);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const price = Number(body?.price);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!name) return fail("Nom kiriting", 422);
  if (!Number.isFinite(price) || price < 0) return fail("Narx noto'g'ri", 422);
  if (items.length === 0) return fail("Kamida bitta mahsulot tanlang", 422);

  const count = await prisma.combo.count({ where: { restaurantId: restaurant.id } });
  const combo = await prisma.combo.create({
    data: {
      restaurantId: restaurant.id,
      name,
      price,
      oldPrice: body?.oldPrice ? Number(body.oldPrice) : null,
      image: body?.image || null,
      description: body?.description || null,
      items: JSON.stringify(items),
      sortOrder: count,
    },
  });
  return ok(combo, 201);
}
