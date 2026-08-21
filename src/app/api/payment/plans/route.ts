import { authGuard, ok } from "@/lib/api";
import { getPlanPrices, getLifetimePrices } from "@/lib/plan-prices";

// Foydalanuvchi uchun joriy tarif narxlari (oylik + umrbod)
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const [prices, lifetime] = await Promise.all([getPlanPrices(), getLifetimePrices()]);
  return ok({ ...prices, lifetime });
}
