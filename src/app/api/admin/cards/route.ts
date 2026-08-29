import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

const schema = z.object({
  bankName: z.string().min(1, "Bank nomi"),
  cardNumber: z.string().min(4, "Karta raqami"),
  cardHolder: z.string().min(1, "Karta egasi"),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard("cards");
  if (!user) return res;
  const cards = await prisma.paymentCard.findMany({
    orderBy: { createdAt: "asc" },
  });
  return ok(cards);
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("cards");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const card = await prisma.paymentCard.create({ data: parsed.data });
  return ok(card, 201);
}
