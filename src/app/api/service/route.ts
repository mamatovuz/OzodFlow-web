import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, getMembership, ok, fail } from "@/lib/api";

// Ommaviy: ofitsiant chaqirish / hisob so'rash
const schema = z.object({
  slug: z.string().min(1),
  tableCode: z.string().optional().nullable(),
  type: z.enum(["WAITER", "BILL"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  let tableName: string | null = null;
  if (parsed.data.tableCode) {
    const t = await prisma.restaurantTable.findFirst({
      where: { code: parsed.data.tableCode, restaurantId: restaurant.id },
    });
    tableName = t?.name ?? null;
  }

  // Bir stoldan bir xil aktiv chaqiruv takrorlanmasin
  const dup = await prisma.serviceCall.findFirst({
    where: {
      restaurantId: restaurant.id,
      tableCode: parsed.data.tableCode || null,
      type: parsed.data.type,
      status: "ACTIVE",
    },
  });
  if (dup) return ok({ id: dup.id, already: true });

  const call = await prisma.serviceCall.create({
    data: {
      restaurantId: restaurant.id,
      tableCode: parsed.data.tableCode || null,
      tableName,
      type: parsed.data.type,
      status: "ACTIVE",
    },
  });
  return ok({ id: call.id }, 201);
}

// Owner yoki staff: aktiv chaqiruvlar
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  let restaurantId: string | null = null;
  const owned = await getUserRestaurant(user.id);
  restaurantId = owned?.id ?? null;
  if (!restaurantId) {
    const m = await getMembership(user.id);
    restaurantId = m?.restaurant.id ?? null;
  }
  if (!restaurantId) return fail("Restoran topilmadi", 404);

  const calls = await prisma.serviceCall.findMany({
    where: { restaurantId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  return ok(calls);
}
