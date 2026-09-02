import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";
import { createImpersonationSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const schema = z.object({ userId: z.string().min(1) });

// Restoran egasi o'z xodimining (oshxona/ofitsant/kassir) paneliga parolsiz kiradi.
export async function POST(req: NextRequest) {
  const { user: owner, res } = await authGuard();
  if (!owner) return res;

  const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: owner.id } });
  if (!restaurant) return fail("Faqat restoran egasi xodim paneliga kiradi", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Foydalanuvchi ID kerak", 422);

  // Target — shu restoranning xodimi bo'lishi shart
  const membership = await prisma.membership.findFirst({
    where: { userId: parsed.data.userId, restaurantId: restaurant.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!membership) return fail("Bu xodim sizning restoraningizga tegishli emas", 404);

  const redirect = membership.role === "MANAGER" ? "/dashboard" : "/staff";

  const userAgent = req.headers.get("user-agent") || undefined;
  await createImpersonationSession(membership.user.id, owner.id, { userAgent, ip: clientIp(req) });

  log.info("owner_impersonate", { ownerId: owner.id, targetId: membership.user.id });
  return ok({ redirect, name: membership.user.name });
}
