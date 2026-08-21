import { prisma } from "./prisma";
import { PLANS, LIFETIME_MONTHS, type PlanKey } from "./plans";

const PRICED: PlanKey[] = ["STARTER", "BUSINESS"];

// Umrbod narxi: admin belgilagan bo'lsa (>0) o'sha, aks holda oylik×36
export function effectiveLifetime(monthly: number, lifetimeSet: number): number {
  return lifetimeSet > 0 ? lifetimeSet : monthly * LIFETIME_MONTHS;
}

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

// ─── Umrbod narxlar ───

// Admin belgilagan umrbod narxlar (0 = avtomatik oylik×36)
export async function getLifetimePricesRaw(): Promise<Record<string, number>> {
  const rows = await prisma.planConfig.findMany();
  const map = new Map(rows.map((r) => [r.plan, r.lifetimePrice]));
  const out: Record<string, number> = {};
  for (const p of PRICED) out[p] = map.get(p) ?? 0;
  return out;
}

// Yakuniy umrbod narxlar (avtomatik hisoblangan yoki admin narxi)
export async function getLifetimePrices(): Promise<Record<string, number>> {
  const [monthly, raw] = await Promise.all([getPlanPrices(), getLifetimePricesRaw()]);
  const out: Record<string, number> = {};
  for (const p of PRICED) out[p] = effectiveLifetime(monthly[p] ?? PLANS[p].defaultPrice, raw[p] ?? 0);
  return out;
}

export async function getLifetimePrice(plan: PlanKey): Promise<number> {
  if (!PRICED.includes(plan)) return 0;
  const row = await prisma.planConfig.findUnique({ where: { plan } });
  const monthly = row?.price ?? PLANS[plan].defaultPrice;
  return effectiveLifetime(monthly, row?.lifetimePrice ?? 0);
}

export async function setLifetimePrice(plan: PlanKey, lifetimePrice: number) {
  return prisma.planConfig.upsert({
    where: { plan },
    update: { lifetimePrice },
    create: { plan, price: PLANS[plan].defaultPrice, lifetimePrice },
  });
}
