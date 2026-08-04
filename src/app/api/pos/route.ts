import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { getPosOwner } from "@/lib/pos-access";
import { PROVIDER_META } from "@/lib/pos";

// ─── POS integratsiya holati + provayderlar ro'yxati ───
export async function GET() {
  const acc = await getPosOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  // PLAN xatosida ham provayderlar ro'yxatini ko'rsatamiz (yuqori tarifga taklif uchun)
  const restaurantId = acc.restaurant.id;

  const integration = await prisma.posIntegration.findFirst({
    where: { restaurantId },
  });

  const logs = integration
    ? await prisma.posSyncLog.findMany({
        where: { integrationId: integration.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return ok({
    locked: acc.error === "PLAN",
    providers: PROVIDER_META,
    integration: integration
      ? {
          id: integration.id,
          provider: integration.provider,
          status: integration.status,
          isActive: integration.isActive,
          autoSync: integration.autoSync,
          syncIntervalMin: integration.syncIntervalMin,
          lastSyncAt: integration.lastSyncAt,
          lastError: integration.lastError,
        }
      : null,
    logs,
  });
}

// ─── Integratsiyani o'chirish (mahsulotlar saqlanadi) ───
export async function DELETE() {
  const acc = await getPosOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN" || acc.error === "PLAN") return fail("Ruxsat yo'q", 403);

  await prisma.posIntegration.deleteMany({ where: { restaurantId: acc.restaurant.id } });
  return ok({ removed: true });
}
