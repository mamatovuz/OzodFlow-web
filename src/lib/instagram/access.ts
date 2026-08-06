/**
 * Instagram Automation route'lari uchun ruxsat tekshiruvi.
 * Modul barcha tariflarda ochiq (FREE dan boshlab) — POS bilan bir xil siyosat.
 */
import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";

type Restaurant = NonNullable<Awaited<ReturnType<typeof getUserRestaurant>>>;

export type IgAccess =
  | { error: "UNAUTHORIZED" }
  | { error: "FORBIDDEN" }
  | { error: null; restaurant: Restaurant };

/** Faqat restoran egasi Instagram automatlashtirishni boshqaradi */
export async function getIgOwner(): Promise<IgAccess> {
  const user = await getSessionUser();
  if (!user) return { error: "UNAUTHORIZED" };
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return { error: "FORBIDDEN" };
  return { error: null, restaurant };
}
