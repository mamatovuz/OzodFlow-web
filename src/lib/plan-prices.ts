import { prisma } from "./prisma";
import { PLANS, type PlanKey } from "./plans";

// Narxlarni DB'dan oladi (bo'lmasa standart narx). Server-only.
export async function getPlanPrices(): Promise<Record<PlanKey, number>> {
  const rows = await prisma.planConfig.findMany();
  const map = new Map(rows.map((r) => [r.plan, r.price]));
  return {
    FREE: 0,
    PRO: map.get("PRO") ?? PLANS.PRO.defaultPrice,
    PROMAX: map.get("PROMAX") ?? PLANS.PROMAX.defaultPrice,
  };
}

export async function getPlanPrice(plan: PlanKey): Promise<number> {
  if (plan === "FREE") return 0;
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
