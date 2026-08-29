import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "Nom kiritilishi shart"),
  image: z.string().min(1, "Rasm yuklang"),
  url: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard("partners");
  if (!user) return res;
  const partners = await prisma.partner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return ok(partners);
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("partners");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const count = await prisma.partner.count();
  const partner = await prisma.partner.create({
    data: {
      name: parsed.data.name,
      image: parsed.data.image,
      url: parsed.data.url?.trim() || null,
      sortOrder: count,
    },
  });
  return ok(partner, 201);
}
