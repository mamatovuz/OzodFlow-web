import { prisma } from "./prisma";
import { PLANS, type PlanKey } from "./plans";

const PRICED: PlanKey[] = ["STARTER", "PRO", "BUSINESS"];

// Narxlarni DB'dan oladi (bo'lmasa standart narx). Server-only.
export async function getPlanPrices(): Promise<Record<string, number>> {
  const rows = await prisma.planConfig.findMany();
  const map = new Map(rows.map((r) => [r.plan, r.price]));
  const out: Record<string, number> = { FREE: 0, ENTERPRISE: 0 };
  for (const p of PRICED) out[p] = map.get(p) ?? PLANS[p].defaultPrice;
  return out;
}

export async function getPlanPrice(plan: PlanKey): Promise<number> {
  if (!PRICED.includes(plan)) return 0;
  const row = await prisma.planConfig.findUnique({ where: { plan } });
  return row?.price ?? PLANS[plan].defaultPrice;
}

export async function setPlanPrice(plan: PlanKey, price: number) {
  return prisma.planConfig.upsert({
    where: { plan },
    update: { price },
    create: { plan, price },
  });
}
