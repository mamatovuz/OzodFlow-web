import { fail, ok, route } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { getDailyStats } from "@/lib/instagram/stats";

export const dynamic = "force-dynamic";

// ─── Oxirgi N kunlik statistika (grafik) ───
export const GET = route(async (req) => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const days = Math.min(90, Math.max(7, parseInt(new URL(req.url).searchParams.get("days") || "30", 10)));
  const daily = await getDailyStats(acc.restaurant.id, days);
  return ok({ daily });
});
