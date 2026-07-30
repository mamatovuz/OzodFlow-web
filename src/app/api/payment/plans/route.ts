import { authGuard, ok } from "@/lib/api";
import { getPlanPrices } from "@/lib/plan-prices";

// Foydalanuvchi uchun joriy tarif narxlari
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const prices = await getPlanPrices();
  return ok(prices);
}
