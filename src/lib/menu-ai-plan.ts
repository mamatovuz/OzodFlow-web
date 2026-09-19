// Menyu AI (mijozlar uchun) — bepul kvota + pullik oylik obuna.
// Restoran menyu AI'ni ozgina bepul sinaydi; kvota tugagach oyiga to'lab davom etadi.

export const MENU_AI_FREE_QUOTA = 20; // bepul sinov: shuncha mijoz so'rovi
export const MENU_AI_PRICE_SOM = 280000; // oylik narx (≈ $22.4)
export const MENU_AI_PRICE_USD = 22.4;
export const MENU_AI_DAYS = 30; // to'lov 1 oyga (30 kun) ochadi

export type MenuAiStatus = {
  paidActive: boolean;
  locked: boolean; // bepul kvota tugagan va to'lanmagan
  used: number;
  quota: number;
  remaining: number;
  paidUntil: string | null;
  priceSom: number;
  priceUsd: number;
};

export function menuAiStatus(r: { menuAiUsed: number; menuAiPaidUntil: Date | null }): MenuAiStatus {
  const now = Date.now();
  const paidActive = !!r.menuAiPaidUntil && new Date(r.menuAiPaidUntil).getTime() > now;
  const remaining = Math.max(0, MENU_AI_FREE_QUOTA - r.menuAiUsed);
  const locked = !paidActive && remaining <= 0;
  return {
    paidActive,
    locked,
    used: r.menuAiUsed,
    quota: MENU_AI_FREE_QUOTA,
    remaining,
    paidUntil: r.menuAiPaidUntil ? new Date(r.menuAiPaidUntil).toISOString() : null,
    priceSom: MENU_AI_PRICE_SOM,
    priceUsd: MENU_AI_PRICE_USD,
  };
}
