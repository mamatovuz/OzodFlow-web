import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { createImpersonationSession } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const schema = z.object({ userId: z.string().min(1) });

// Admin foydalanuvchi (restoran egasi yoki xodim) paneliga parolsiz kiradi.
export async function POST(req: NextRequest) {
  const { user: admin, res } = await adminGuard();
  if (!admin) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Foydalanuvchi ID kerak", 422);

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      name: true,
      role: true,
      restaurants: { select: { id: true }, take: 1 },
      memberships: { select: { role: true }, take: 1 },
    },
  });
  if (!target) return fail("Foydalanuvchi topilmadi", 404);
  // Adminni admin sifatida taqlid qilib bo'lmaydi (xavfsizlik)
  if (target.role === "ADMIN") return fail("Admin hisobiga kirib bo'lmaydi", 403);

  // Yo'naltirish: egasi/menejer → /dashboard, boshqa xodim → /staff
  const isOwner = target.restaurants.length > 0;
  const membershipRole = target.memberships[0]?.role;
  const redirect =
    isOwner || membershipRole === "MANAGER" ? "/dashboard" : membershipRole ? "/staff" : "/dashboard";

  const userAgent = req.headers.get("user-agent") || undefined;
  await createImpersonationSession(target.id, admin.id, { userAgent, ip: clientIp(req) });

  log.info("admin_impersonate", { adminId: admin.id, targetId: target.id });
  return ok({ redirect, name: target.name });
}
