import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Brute-force himoyasi: IP bo'yicha daqiqasiga 10 urinish
  const limited = limitOrReject(req, "login", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { password } = parsed.data;
  // Email/telefonni normallashtirish: bo'sh joy va katta harflarni tozalash
  // (telefon/brauzer birinchi harfni avto-katta qilishi mumkin)
  const identifier = parsed.data.identifier.trim();
  const lower = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: lower },
        { email: identifier },
        { phone: identifier },
        { phone: lower },
      ],
    },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    return fail("Email/telefon yoki parol noto'g'ri", 401);
  }

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent") || undefined,
  });

  // Yo'naltirish manzilini aniqlaymiz
  let redirect = "/dashboard";
  if (user.role === "ADMIN") {
    redirect = "/admins";
  } else {
    const owns = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
    if (!owns) {
      const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
      if (membership) redirect = membership.role === "MANAGER" ? "/dashboard" : "/staff";
    }
  }

  return ok({ id: user.id, name: user.name, role: user.role, redirect });
}
