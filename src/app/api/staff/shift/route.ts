import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getOpenShift, shiftTotals } from "@/lib/shifts";

// GET — xodimning hozirgi ochiq smenasi + jonli tushum (naqd/karta)
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const shift = await getOpenShift(restaurant.id, user.id);
  if (!shift) return ok({ shift: null });

  const totals = await shiftTotals(shift.id);
  return ok({
    shift: {
      id: shift.id,
      openingCash: shift.openingCash,
      openedAt: shift.openedAt.toISOString(),
      staffName: shift.staffName,
      ...totals,
      expectedCash: shift.openingCash + totals.cashSales,
    },
  });
}

// POST — smena ochish (boshlang'ich kassa)
const openSchema = z.object({ openingCash: z.number().min(0).max(1e12) });

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = openSchema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const existing = await getOpenShift(restaurant.id, user.id);
  if (existing) return fail("Sizda allaqachon ochiq smena bor", 409);

  const shift = await prisma.shift.create({
    data: {
      restaurantId: restaurant.id,
      staffId: user.id,
      staffName: user.name,
      openingCash: parsed.data.openingCash,
    },
  });
  return ok({ id: shift.id, openedAt: shift.openedAt.toISOString() });
}

// PATCH — smena yopish (haqiqiy kassa) → naqd/karta tushum, kutilgan kassa, farq
const closeSchema = z.object({ actualCash: z.number().min(0).max(1e12) });

export async function PATCH(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const shift = await getOpenShift(restaurant.id, user.id);
  if (!shift) return fail("Ochiq smena topilmadi", 404);

  const totals = await shiftTotals(shift.id);
  const expectedCash = shift.openingCash + totals.cashSales;
  const difference = parsed.data.actualCash - expectedCash;

  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingCash: parsed.data.actualCash,
      cashSales: totals.cashSales,
      cardSales: totals.cardSales,
      ordersCount: totals.ordersCount,
      expectedCash,
      difference,
    },
  });

  return ok({
    openingCash: updated.openingCash,
    cashSales: updated.cashSales,
    cardSales: updated.cardSales,
    ordersCount: updated.ordersCount,
    expectedCash: updated.expectedCash,
    actualCash: updated.closingCash,
    difference: updated.difference,
    openedAt: updated.openedAt.toISOString(),
    closedAt: updated.closedAt?.toISOString() ?? null,
  });
}
