import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { getSiteMetricCounts } from "@/lib/stats";

const metricEnum = z.enum(["restaurants", "products", "scans"]);

const schema = z.object({
  value: z.string().min(1, "Qiymat kiriting"),
  label: z.string().min(1, "Izoh kiriting"),
  metric: metricEnum.nullable().optional(),
  auto: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { user, res } = await adminGuard("stats");
  if (!user) return res;
  const [stats, counts] = await Promise.all([
    prisma.siteStat.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getSiteMetricCounts(),
  ]);
  // `counts` — admin uchun tavsiya qilinadigan haqiqiy sonlar.
  return ok({ stats, counts });
}

export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("stats");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const count = await prisma.siteStat.count();
  const stat = await prisma.siteStat.create({
    data: {
      value: parsed.data.value,
      label: parsed.data.label,
      metric: parsed.data.metric ?? null,
      auto: parsed.data.auto ?? false,
      sortOrder: count,
    },
  });
  return ok(stat, 201);
}
