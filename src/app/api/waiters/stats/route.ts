import { NextRequest } from "next/server";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getWaiterStats, type WaiterPeriod } from "@/lib/waiters";

const PERIODS: WaiterPeriod[] = ["today", "week", "month", "all"];

// Ofitsantlar bo'yicha statistika (davr: today | week | month | all)
export async function GET(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const p = req.nextUrl.searchParams.get("period") as WaiterPeriod | null;
  const period: WaiterPeriod = p && PERIODS.includes(p) ? p : "week";

  const rows = await getWaiterStats(restaurant.id, period);
  return ok({ period, rows });
}
