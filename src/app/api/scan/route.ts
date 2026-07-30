import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

// Ommaviy endpoint — mijoz menyuni ochganda skan hodisasini yozadi.
// Body: { slug: string, tableCode?: string, visitorId?: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug: string | undefined = body?.slug;
  if (!slug) return fail("slug talab qilinadi", 422);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  await prisma.scanEvent.create({
    data: {
      restaurantId: restaurant.id,
      tableCode: body?.tableCode || null,
      visitorId: body?.visitorId || null,
      userAgent: req.headers.get("user-agent") || null,
    },
  });

  if (body?.tableCode) {
    await prisma.restaurantTable
      .updateMany({
        where: { code: body.tableCode, restaurantId: restaurant.id },
        data: { scans: { increment: 1 } },
      })
      .catch(() => {});
  }

  return ok({ tracked: true });
}
