import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// Ommaviy: menyu ko'ruvchi "tirik" ekanini bildiradi (live counter uchun)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = body?.slug;
  const visitorId = body?.visitorId;
  if (!slug || !visitorId) return fail("slug va visitorId kerak", 422);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  await prisma.presence.upsert({
    where: { restaurantId_visitorId: { restaurantId: restaurant.id, visitorId } },
    update: { lastSeen: new Date() },
    create: { restaurantId: restaurant.id, visitorId },
  });
  return ok({ ok: true });
}
