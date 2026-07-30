// Tarif rejalar va to'lov mantiqi
// Pullik tariflar BIR MARTALIK to'lov — umrbod amal qiladi.

export type PlanKey = "FREE" | "PRO" | "PROMAX";

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    price: number; // bir martalik narx (so'm)
    oneTime: boolean;
    productLimit: number | null;
    premiumThemes: boolean; // premium menyu dizaynlari
    customDomain: boolean; // o'z domenini ulash
    features: string[];
  }
> = {
  FREE: {
    name: "Free",
    price: 0,
    oneTime: false,
    productLimit: 20,
    premiumThemes: false,
    customDomain: false,
    features: [
      "20 ta mahsulot",
      "7 kunlik sinov muddati",
      "Oq va Qora dizayn",
      "Asosiy QR kod",
    ],
  },
  PRO: {
    name: "Pro",
    price: 30000,
    oneTime: true,
    productLimit: null,
    premiumThemes: false,
    customDomain: true,
    features: [
      "Cheksiz mahsulot",
      "To'liq statistika",
      "Cheksiz QR kod",
      "O'z domeningizni ulash",
      "Bir martalik to'lov — umrbod",
    ],
  },
  PROMAX: {
    name: "Pro Max",
    price: 99000,
    oneTime: true,
    productLimit: null,
    premiumThemes: true,
    customDomain: true,
    features: [
      "Pro dagi hammasi",
      "5 ta premium menyu dizayni",
      "O'z domeningizni ulash",
      "Filiallar va xodimlar (tez orada)",
      "Bir martalik to'lov — umrbod",
    ],
  },
};

export const PAID_PLANS: PlanKey[] = ["PRO", "PROMAX"];

export const FREE_TRIAL_DAYS = 7;

/**
 * Restoranning amaldagi tarifini hisoblaydi.
 * FREE trial muddati tugasa "expired". Pullik tariflar umrbod (planUntil = null).
 */
export function getEffectivePlan(restaurant: {
  plan: string;
  planUntil: Date | null;
}) {
  const now = new Date();
  const plan = (restaurant.plan as PlanKey) || "FREE";
  const until = restaurant.planUntil ? new Date(restaurant.planUntil) : null;

  // Pullik tariflar umrbod — muddat tekshirilmaydi
  const isPaid = PAID_PLANS.includes(plan);
  const expired = !isPaid && until ? until < now : false;

  const effective: PlanKey = expired ? "FREE" : plan;

  return {
    plan,
    effective,
    expired,
    isPaid,
    planUntil: until,
    productLimit: PLANS[effective].productLimit,
    canPremiumThemes: PLANS[effective].premiumThemes,
    canCustomDomain: PLANS[effective].customDomain,
    daysLeft: !isPaid && until
      ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86400000))
      : null,
  };
}
