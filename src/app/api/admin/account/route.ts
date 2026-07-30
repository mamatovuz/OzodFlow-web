import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgi").optional().or(z.literal("")),
});

export async function GET() {
  const { user, res } = await adminGuard();
  if (!user) return res;
  return ok({ name: user.name, email: user.email });
}

export async function PATCH(req: NextRequest) {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  // Email band emasligini tekshirish
  const taken = await prisma.user.findFirst({
    where: { email, NOT: { id: user.id } },
  });
  if (taken) return fail("Bu email boshqa hisobda ishlatilgan", 409);

  const data: Record<string, unknown> = { email };
  if (name) data.name = name;
  if (password) data.password = await hashPassword(password);

  await prisma.user.update({ where: { id: user.id }, data });
  return ok({ updated: true });
}
