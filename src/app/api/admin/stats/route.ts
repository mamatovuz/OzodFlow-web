import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

const schema = z.object({
  value: z.string().min(1, "Qiymat kiriting"),
  label: z.string().min(1, "Izoh kiriting"),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const stats = await prisma.siteStat.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return ok(stats);
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const count = await prisma.siteStat.count();
  const stat = await prisma.siteStat.create({
    data: {
      value: parsed.data.value,
      label: parsed.data.label,
      sortOrder: count,
    },
  });
  return ok(stat, 201);
}
