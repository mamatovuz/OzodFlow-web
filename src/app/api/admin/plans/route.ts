import { NextRequest } from "next/server";
import { adminGuard, ok, fail } from "@/lib/api";
import { getPlanPrices, setPlanPrice } from "@/lib/plan-prices";

export async function GET() {
  const { user, res } = await adminGuard();
  if (!user) return res;
  const prices = await getPlanPrices();
  return ok(prices);
}

// Body: { plan: "STARTER"|"PRO"|"BUSINESS", price: number }
export async function PATCH(req: NextRequest) {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  const price = Number(body?.price);
  if (!["STARTER", "PRO", "BUSINESS"].includes(plan)) return fail("Noto'g'ri tarif", 422);
  if (!Number.isFinite(price) || price < 0) return fail("Noto'g'ri narx", 422);

  await setPlanPrice(plan, Math.round(price));
  const prices = await getPlanPrices();
  return ok(prices);
}
