import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW, clientIp } from "@/lib/rate-limit";

// Tasdiqlash kodini tekshiradi. To'g'ri bo'lsa: emailVerified=true qilib,
// sessiya ochadi va onboarding'ga yo'naltiradi.
// Body: { email, code }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "verify-email", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const code = String(body?.code || "").trim();
  if (!email || code.length < 4) return fail("Email va kodni kiriting", 422);

  const record = await prisma.verifyCode.findFirst({
    where: { email, code, used: false },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) {
    return fail("Kod noto'g'ri yoki muddati tugagan", 400);
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) return fail("Foydalanuvchi topilmadi", 404);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
    prisma.verifyCode.update({ where: { id: record.id }, data: { used: true } }),
    prisma.verifyCode.deleteMany({ where: { email } }),
  ]);

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent") || undefined,
    ip: clientIp(req),
  });

  // Onboarding tugamagan bo'lsa — o'sha yerga, aks holda dashboard.
  const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
  const redirect = restaurant && !restaurant.onboarded ? "/onboarding" : "/dashboard";
  return ok({ verified: true, redirect });
}
