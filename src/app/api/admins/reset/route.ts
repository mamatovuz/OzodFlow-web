import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().min(3),
  code: z.string().min(4),
  password: z.string().min(6, "Parol kamida 6 belgi"),
});

// Kod bilan parolni tiklash
// Body: { email, code, password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { code, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, role: "ADMIN" },
  });
  if (!user) return fail("Kod yoki email noto'g'ri", 400);

  const reset = await prisma.passwordReset.findFirst({
    where: { userId: user.id, code, used: false },
    orderBy: { createdAt: "desc" },
  });
  if (!reset || reset.expiresAt < new Date()) {
    return fail("Kod noto'g'ri yoki muddati tugagan", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password) },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    }),
    // Barcha eski sessiyalarni bekor qilish
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  return ok({ reset: true });
}
