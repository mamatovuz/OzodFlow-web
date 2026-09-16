import { authGuard, ok } from "@/lib/api";
import { getPlanPrices, getLifetimePrices } from "@/lib/plan-prices";
import { inpayConfigured } from "@/lib/inpay";

// Foydalanuvchi uchun joriy tarif narxlari (oylik + umrbod) + onlayn to'lov holati
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const [prices, lifetime] = await Promise.all([getPlanPrices(), getLifetimePrices()]);
  return ok({ ...prices, lifetime, inpay: inpayConfigured() });
}
