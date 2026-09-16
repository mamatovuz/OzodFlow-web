import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { hashPassword, encryptPasswordPlain } from "@/lib/auth";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(20, "Havola noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
});

// Email havolasidagi token bilan parolni tiklaydi.
// Body: { token, password }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "reset", { limit: 10, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }
  const { token, password } = parsed.data;

  const reset = await prisma.passwordReset.findFirst({
    where: { token, used: false },
  });
  if (!reset || reset.expiresAt < new Date()) {
    return fail("Havola noto'g'ri yoki muddati tugagan. Qaytadan so'rang.", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: {
        password: await hashPassword(password),
        passwordEnc: encryptPasswordPlain(password),
      },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    // Xavfsizlik: barcha eski sessiyalarni bekor qilamiz
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
  ]);

  return ok({ reset: true });
}
