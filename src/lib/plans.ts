// Tarif rejalar metama'lumoti (narxlar DB'da — lib/plan-prices.ts)
// Pullik tariflar OYLIK — muddati tugaydi.

export type PlanKey = "FREE" | "PRO" | "PROMAX";

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    defaultPrice: number; // oylik standart narx (admin o'zgartiradi)
    productLimit: number | null;
    premiumThemes: boolean; // premium menyu dizaynlari
    customDomain: boolean; // o'z domenini ulash
    ordersEnabled: boolean;
  }
> = {
  FREE: {
    name: "Free",
    defaultPrice: 0,
    productLimit: 20,
    premiumThemes: false,
    customDomain: false,
    ordersEnabled: true,
  },
  PRO: {
    name: "Pro",
    defaultPrice: 30000,
    productLimit: null,
    premiumThemes: false,
    customDomain: false,
    ordersEnabled: true,
  },
  PROMAX: {
    name: "Pro Max",
    defaultPrice: 99000,
    productLimit: null,
    premiumThemes: true,
    customDomain: true,
    ordersEnabled: true,
  },
};

export const PAID_PLANS: PlanKey[] = ["PRO", "PROMAX"];
export const FREE_TRIAL_DAYS = 7;
export const PLAN_DAYS = 30; // oylik obuna muddati

// Admin orqali domen ulash xizmati narxi (yillik)
export const DOMAIN_SERVICE_PRICE = 40000;

// Muddat narxlari 1 oylik narxdan avtomatik hisoblanadi
export const YEARLY_DISCOUNT = 100000; // 1 yillikda chegirma (so'm)
export const LIFETIME_MONTHS = 36; // umrbod = 36 oyga teng narx

export type DurationOption = {
  key: string;
  label: string;
  months: number; // umrbod uchun 0
  lifetime?: boolean;
  custom?: boolean;
};

export const DURATIONS: DurationOption[] = [
  { key: "1", label: "1 oy", months: 1 },
  { key: "3", label: "3 oy", months: 3 },
  { key: "6", label: "6 oy", months: 6 },
  { key: "12", label: "1 yil", months: 12 },
  { key: "custom", label: "Boshqa", months: 0, custom: true },
  { key: "lifetime", label: "Umrbod", months: 0, lifetime: true },
];

/**
 * 1 oylik narxdan muddat narxini hisoblaydi.
 * Har to'liq yilga YEARLY_DISCOUNT chegirma. Umrbod = LIFETIME_MONTHS × oylik.
 */
export function computePrice(
  monthly: number,
  months: number,
  lifetime = false
): number {
  if (lifetime) return monthly * LIFETIME_MONTHS;
  if (months <= 0) return 0;
  let total = monthly * months;
  const years = Math.floor(months / 12);
  total -= YEARLY_DISCOUNT * years;
  return Math.max(0, Math.round(total));
}

// Landing/taqqoslash uchun to'liq funksiyalar ro'yxati.
// har bir funksiya qaysi tariflarda borligini ko'rsatadi.
export const FEATURE_MATRIX: {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  promax: boolean | string;
}[] = [
  { label: "Mahsulotlar soni", free: "20 ta", pro: "Cheksiz", promax: "Cheksiz" },
  { label: "QR menyu", free: true, pro: true, promax: true },
  { label: "Buyurtma tizimi", free: true, pro: true, promax: true },
  { label: "Stol QR kodlari", free: true, pro: true, promax: true },
  { label: "Global qidiruv", free: true, pro: true, promax: true },
  { label: "Oq va Qora dizayn", free: true, pro: true, promax: true },
  { label: "To'liq statistika", free: false, pro: true, promax: true },
  { label: "Real vaqt buyurtmalar", free: true, pro: true, promax: true },
  { label: "Ovozli bildirishnoma", free: false, pro: true, promax: true },
  { label: "5 ta premium dizayn", free: false, pro: false, promax: true },
  { label: "O'z domeningiz", free: false, pro: false, promax: true },
  { label: "Xodimlar va rollar", free: false, pro: false, promax: true },
  { label: "Excel import/eksport", free: false, pro: false, promax: true },
  { label: "Reklama bannerlari", free: false, pro: true, promax: true },
];

/**
 * Restoranning amaldagi tarifini hisoblaydi.
 * Pullik tariflar OYLIK — planUntil o'tsa muddati tugaydi (FREE limitlariga tushadi).
 */
export function getEffectivePlan(restaurant: {
  plan: string;
  planUntil: Date | null;
}) {
  const now = new Date();
  const plan = (restaurant.plan as PlanKey) || "FREE";
  const until = restaurant.planUntil ? new Date(restaurant.planUntil) : null;

  const expired = until ? until < now : false;
  const effective: PlanKey = expired ? "FREE" : plan;

  return {
    plan,
    effective,
    expired,
    isPaid: PAID_PLANS.includes(plan),
    planUntil: until,
    productLimit: PLANS[effective].productLimit,
    canPremiumThemes: PLANS[effective].premiumThemes,
    canCustomDomain: PLANS[effective].customDomain,
    daysLeft: until
      ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86400000))
      : null,
  };
}
