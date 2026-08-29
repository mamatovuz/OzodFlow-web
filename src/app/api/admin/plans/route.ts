import { NextRequest } from "next/server";
import { adminGuard, ok, fail } from "@/lib/api";
import {
  getPlanPrices,
  setPlanPrice,
  getLifetimePricesRaw,
  setLifetimePrice,
} from "@/lib/plan-prices";
import type { PlanKey } from "@/lib/plans";

export async function GET() {
  const { user, res } = await adminGuard("plans");
  if (!user) return res;
  const [prices, lifetime] = await Promise.all([getPlanPrices(), getLifetimePricesRaw()]);
  return ok({ ...prices, lifetime });
}

// Body: { plan: "STARTER"|"BUSINESS", price?: number, lifetimePrice?: number }
export async function PATCH(req: NextRequest) {
  const { user, res } = await adminGuard("plans");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (!["STARTER", "BUSINESS"].includes(plan)) return fail("Noto'g'ri tarif", 422);

  if (body?.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return fail("Noto'g'ri narx", 422);
    await setPlanPrice(plan as PlanKey, Math.round(price));
  }
  if (body?.lifetimePrice !== undefined) {
    const lp = Number(body.lifetimePrice);
    if (!Number.isFinite(lp) || lp < 0) return fail("Noto'g'ri umrbod narx", 422);
    await setLifetimePrice(plan as PlanKey, Math.round(lp));
  }

  const [prices, lifetime] = await Promise.all([getPlanPrices(), getLifetimePricesRaw()]);
  return ok({ ...prices, lifetime });
}
