import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ slug: z.string().min(1) });

// Ommaviy — /app/<slug> sahifasida "o'rnatish/yuklab olish" bosilganda hisoblaydi.
export const POST = route(async (req) => {
  const limited = limitOrReject(req as NextRequest, "app-download", {
    limit: 30,
    windowMs: WINDOW.minute,
  });
  if (limited) return limited;

  const { slug } = await readJson(req, schema);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (restaurant) {
    await prisma.mobileApp
      .update({
        where: { restaurantId: restaurant.id },
        data: { downloads: { increment: 1 } },
      })
      .catch(() => {}); // ilova yaratilmagan bo'lsa jim o'tamiz
  }

  return ok({ counted: true });
});
