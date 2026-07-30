import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    return fail("Email/telefon yoki parol noto'g'ri", 401);
  }

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return ok({ id: user.id, name: user.name });
}
