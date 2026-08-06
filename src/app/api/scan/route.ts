import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, readJson, route } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

// Ommaviy endpoint — mijoz menyuni ochganda skan hodisasini yozadi.
const schema = z.object({
  slug: z.string().min(1),
  tableCode: z.string().max(64).optional().nullable(),
  visitorId: z.string().max(128).optional().nullable(),
});

export const POST = route(async (req: Request) => {
  // Spam himoyasi: IP bo'yicha daqiqasiga 60 skan
  const limited = limitOrReject(req, "scan", { limit: 60, windowMs: WINDOW.minute });
  if (limited) return limited;

  const data = await readJson(req, schema);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  await prisma.scanEvent.create({
    data: {
      restaurantId: restaurant.id,
      tableCode: data.tableCode || null,
      visitorId: data.visitorId || null,
      userAgent: (req as NextRequest).headers.get("user-agent") || null,
    },
  });

  if (data.tableCode) {
    await prisma.restaurantTable
      .updateMany({
        where: { code: data.tableCode, restaurantId: restaurant.id },
        data: { scans: { increment: 1 } },
      })
      .catch(() => {});
  }

  return ok({ tracked: true });
});
