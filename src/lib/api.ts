import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import { prisma } from "./prisma";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(extra ? { details: extra } : {}) },
    { status }
  );
}

/** Sessiya foydalanuvchisini oladi yoki 401 qaytaradi */
export async function authGuard() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, res: fail("Avtorizatsiya talab qilinadi", 401) };
  }
  return { user, res: null };
}

/**
 * Restoran foydalanuvchiga tegishli ekanini tekshiradi.
 * Egasi yoki a'zosi bo'lsa ruxsat beradi.
 */
export async function guardRestaurant(userId: string, restaurantId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    },
  });
  return restaurant;
}

/** Foydalanuvchining birinchi restoranini oladi */
export async function getUserRestaurant(userId: string) {
  return prisma.restaurant.findFirst({
    where: { OR: [{ ownerId: userId }, { memberships: { some: { userId } } }] },
    orderBy: { createdAt: "asc" },
  });
}
