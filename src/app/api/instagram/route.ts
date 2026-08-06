import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { getTodayStats } from "@/lib/instagram/stats";
import { isIgConfigured } from "@/lib/instagram/config";

export const dynamic = "force-dynamic";

// ─── Instagram Automation umumiy holati (dashboard) ───
export async function GET() {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const restaurantId = acc.restaurant.id;
  const account = await prisma.instagramAccount.findUnique({ where: { restaurantId } });

  const [today, ruleCount, activeRules] = await Promise.all([
    getTodayStats(restaurantId),
    prisma.instagramRule.count({ where: { restaurantId } }),
    prisma.instagramRule.count({ where: { restaurantId, enabled: true } }),
  ]);

  return ok({
    configured: isIgConfigured(),
    account: account
      ? {
          username: account.username,
          name: account.name,
          profilePicture: account.profilePicture,
          followers: account.followers,
          following: account.following,
          mediaCount: account.mediaCount,
          status: account.status,
          lastError: account.lastError,
          lastSyncAt: account.lastSyncAt,
          connectedAt: account.connectedAt,
        }
      : null,
    today,
    ruleCount,
    activeRules,
  });
}
