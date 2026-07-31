// Tarif rejalar. Narxlar oylik (DB'da, lib/plan-prices.ts).
// FREE = 7 kunlik sinov. ENTERPRISE = narxi kelishiladi (Telegram orqali).

export type PlanKey = "FREE" | "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE";

type PlanMeta = {
  name: string;
  defaultPrice: number; // oylik (so'm)
  productLimit: number | null; // null = cheksiz
  tableLimit: number | null; // null = cheksiz
  canStaff: boolean; // xodimlar, kitchen/waiter panel
  canService: boolean; // ofitsiant chaqirish, hisob, table map, chek
  canPremiumThemes: boolean;
  canCustomDomain: boolean;
  canBranches: boolean; // filiallar, rollar, API
  contactOnly: boolean; // narxi kelishiladi
};

export const PLANS: Record<PlanKey, PlanMeta> = {
  FREE: {
    name: "Sinov",
    defaultPrice: 0,
    productLimit: 20,
    tableLimit: 5,
    canStaff: false,
    canService: false,
    canPremiumThemes: false,
    canCustomDomain: false,
    canBranches: false,
    contactOnly: false,
  },
  STARTER: {
    name: "Starter",
    defaultPrice: 79000,
    productLimit: null,
    tableLimit: 30,
    canStaff: false,
    canService: false,
    canPremiumThemes: false,
    canCustomDomain: false,
    canBranches: false,
    contactOnly: false,
  },
  PRO: {
    name: "Pro",
    defaultPrice: 149000,
    productLimit: null,
    tableLimit: null,
    canStaff: true,
    canService: true,
    canPremiumThemes: true,
    canCustomDomain: false,
    canBranches: false,
    contactOnly: false,
  },
  BUSINESS: {
    name: "Business",
    defaultPrice: 299000,
    productLimit: null,
    tableLimit: null,
    canStaff: true,
    canService: true,
    canPremiumThemes: true,
    canCustomDomain: true,
    canBranches: true,
    contactOnly: false,
  },
  ENTERPRISE: {
    name: "Enterprise",
    defaultPrice: 0,
    productLimit: null,
    tableLimit: null,
    canStaff: true,
    canService: true,
    canPremiumThemes: true,
    canCustomDomain: true,
    canBranches: true,
    contactOnly: true,
  },
};

// Sotib olinadigan tariflar (self-service)
export const PAID_PLANS: PlanKey[] = ["STARTER", "PRO", "BUSINESS"];

export const FREE_TRIAL_DAYS = 7;
export const PLAN_DAYS = 30;
export const DOMAIN_SERVICE_PRICE = 40000;
export const YEARLY_DISCOUNT = 100000;
export const LIFETIME_MONTHS = 36;

// To'lov muddati o'tgach beriladigan qo'shimcha muhlat (kun).
// Masalan: 12-sanada to'lash kerak bo'lsa, 14-kun kechigacha imkon beriladi.
export const PAYMENT_GRACE_DAYS = 2;
// Muddat tugashiga shuncha kun qolganda ogohlantirish ko'rsatiladi.
export const PAYMENT_WARN_DAYS = 5;

export type DurationOption = {
  key: string;
  label: string;
  months: number;
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

export function computePrice(monthly: number, months: number, lifetime = false): number {
  if (lifetime) return monthly * LIFETIME_MONTHS;
  if (months <= 0) return 0;
  let total = monthly * months;
  total -= YEARLY_DISCOUNT * Math.floor(months / 12);
  return Math.max(0, Math.round(total));
}

// Landing/taqqoslash uchun to'liq funksiyalar (✓ / ✗ / matn)
export const FEATURE_MATRIX: {
  label: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}[] = [
  { label: "Stollar", free: "5 ta", starter: "30 ta", pro: "Cheksiz", business: "Cheksiz" },
  { label: "Mahsulotlar", free: "20 ta", starter: "Cheksiz", pro: "Cheksiz", business: "Cheksiz" },
  { label: "QR menyu", free: true, starter: true, pro: true, business: true },
  { label: "Buyurtma tizimi", free: true, starter: true, pro: true, business: true },
  { label: "Dashboard va statistika", free: true, starter: true, pro: true, business: true },
  { label: "Oshxona paneli", free: false, starter: false, pro: true, business: true },
  { label: "Ofitsiant paneli", free: false, starter: false, pro: true, business: true },
  { label: "Stol xaritasi (Table Map)", free: false, starter: false, pro: true, business: true },
  { label: "Ofitsiant chaqirish / Hisob", free: false, starter: false, pro: true, business: true },
  { label: "Elektron chek", free: false, starter: false, pro: true, business: true },
  { label: "Real-time yangilanish", free: false, starter: false, pro: true, business: true },
  { label: "Xodimlar (bir nechta)", free: false, starter: false, pro: true, business: true },
  { label: "Premium dizaynlar", free: false, starter: false, pro: true, business: true },
  { label: "Filiallar va rollar", free: false, starter: false, pro: false, business: true },
  { label: "Batafsil hisobotlar", free: false, starter: false, pro: false, business: true },
  { label: "Maxsus domen", free: false, starter: false, pro: false, business: true },
  { label: "API (kelajakda)", free: false, starter: false, pro: false, business: true },
];

export function getEffectivePlan(restaurant: { plan: string; planUntil: Date | null }) {
  const now = new Date();
  const plan = (restaurant.plan as PlanKey) || "FREE";
  const until = restaurant.planUntil ? new Date(restaurant.planUntil) : null;
  const isPaid = PAID_PLANS.includes(plan) || plan === "ENTERPRISE";
  const expired = !isPaid && until ? until < now : false;
  // Noma'lum/eski tarif qiymati bo'lsa FREE'ga qaytamiz
  const effective: PlanKey = expired || !PLANS[plan] ? "FREE" : plan;
  const m = PLANS[effective];

  return {
    plan,
    effective,
    expired,
    isPaid,
    planUntil: until,
    productLimit: m.productLimit,
    tableLimit: m.tableLimit,
    canStaff: m.canStaff,
    canService: m.canService,
    canPremiumThemes: m.canPremiumThemes,
    canCustomDomain: m.canCustomDomain,
    canBranches: m.canBranches,
    daysLeft: until
      ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86400000))
      : null,
  };
}

export type PaymentStatus = {
  isPaid: boolean;
  planUntil: Date | null;
  daysLeft: number | null; // muddat tugashiga qolgan kun (o'tib ketgan bo'lsa 0)
  graceUntil: Date | null; // qo'shimcha muhlat tugash sanasi
  warning: boolean; // muddat yaqinlashdi (hali tugamagan)
  overdue: boolean; // muddat o'tdi, lekin muhlat ichida (hali ishlaydi)
  locked: boolean; // muhlat ham o'tdi — panel qulflanadi
};

/**
 * Pullik tarif uchun to'lov holatini hisoblaydi.
 * FREE tarif va umrbod (planUntil = null) obunalar hech qachon qulflanmaydi.
 */
export function getPaymentStatus(restaurant: {
  plan: string;
  planUntil: Date | null;
}): PaymentStatus {
  const now = new Date();
  const plan = (restaurant.plan as PlanKey) || "FREE";
  const isPaid = PAID_PLANS.includes(plan) || plan === "ENTERPRISE";
  const until = restaurant.planUntil ? new Date(restaurant.planUntil) : null;

  // Umrbod yoki tekin tarif — to'lov muddati kuzatilmaydi
  if (!isPaid || !until) {
    return {
      isPaid,
      planUntil: until,
      daysLeft: null,
      graceUntil: null,
      warning: false,
      overdue: false,
      locked: false,
    };
  }

  const graceUntil = new Date(until.getTime() + PAYMENT_GRACE_DAYS * 86400000);
  const msLeft = until.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const locked = now.getTime() > graceUntil.getTime();
  const overdue = !locked && now.getTime() > until.getTime();
  const warning = !overdue && !locked && msLeft <= PAYMENT_WARN_DAYS * 86400000;

  return { isPaid, planUntil: until, daysLeft, graceUntil, warning, overdue, locked };
}
