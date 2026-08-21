/**
 * POS API route'lari uchun umumiy ruxsat tekshiruvi.
 * POS (kassa) integratsiyasi faqat Business va Enterprise tariflarida.
 */
import { getSessionUser } from "./auth";
import { getUserRestaurant } from "./api";
import { getEffectivePlan } from "./plans";

// Integratsiya faqat Business+ tariflarda (Starter/FREE'da yopiq).
const POS_PLANS = ["BUSINESS", "ENTERPRISE"];

type Restaurant = NonNullable<Awaited<ReturnType<typeof getUserRestaurant>>>;

export type PosAccess =
  | { error: "UNAUTHORIZED" }
  | { error: "FORBIDDEN" }
  | { error: "PLAN"; restaurant: Restaurant }
  | { error: null; restaurant: Restaurant };

export async function getPosOwner(): Promise<PosAccess> {
  const user = await getSessionUser();
  if (!user) return { error: "UNAUTHORIZED" };
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return { error: "FORBIDDEN" };
  const access = getEffectivePlan(restaurant);
  if (!POS_PLANS.includes(access.effective)) return { error: "PLAN", restaurant };
  return { error: null, restaurant };
}
