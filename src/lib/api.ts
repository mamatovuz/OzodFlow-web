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

/** Faqat admin uchun — aks holda 403 */
export async function adminGuard() {
  const user = await getSessionUser();
  if (!user) return { user: null, res: fail("Avtorizatsiya talab qilinadi", 401) };
  if (user.role !== "ADMIN")
    return { user: null, res: fail("Ruxsat yo'q", 403) };
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

/** Foydalanuvchi restoran egasimi (owner) */
export async function isOwner(userId: string) {
  const r = await prisma.restaurant.findFirst({ where: { ownerId: userId } });
  return !!r;
}

/** Xodim (membership) ma'lumotini oladi */
export async function getMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { restaurant: { select: { id: true, name: true, currency: true, slug: true } } },
  });
}
