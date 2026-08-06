import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, readJson, route } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

// Ommaviy: menyu ko'ruvchi "tirik" ekanini bildiradi (live counter uchun)
const schema = z.object({
  slug: z.string().min(1),
  visitorId: z.string().min(1).max(128),
});

export const POST = route(async (req: Request) => {
  const limited = limitOrReject(req, "presence", { limit: 60, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { slug, visitorId } = await readJson(req, schema);

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
});
