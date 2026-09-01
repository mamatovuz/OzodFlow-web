import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getOrCreateTaplink, isHandleTaken } from "@/lib/taplink-db";
import { slugify } from "@/lib/utils";

// Taplink manzilini (handle) tekshirish yoki o'zgartirish.
// Body: { handle: string, check?: boolean }
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  const taplink = await getOrCreateTaplink(restaurant);

  const body = await req.json().catch(() => null);
  const handle = slugify(String(body?.handle || ""));

  if (!handle || handle.length < 3) {
    return fail("Manzil kamida 3 ta belgidan iborat bo'lishi kerak", 422);
  }
  if (handle.length > 40) return fail("Manzil juda uzun", 422);

  if (handle === taplink.handle) {
    return ok({ handle, available: true, current: true });
  }

  const taken = await isHandleTaken(handle, restaurant.id);
  if (taken) return fail("Bu manzil band, boshqasini tanlang", 409);

  if (body?.check) return ok({ handle, available: true });

  const updated = await prisma.taplink.update({
    where: { id: taplink.id },
    data: { handle },
    select: { handle: true },
  });
  return ok({ handle: updated.handle, available: true, saved: true });
}
