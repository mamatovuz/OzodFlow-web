import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { getPosOwner } from "@/lib/pos-access";
import { syncMenu } from "@/lib/pos";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

// ─── Qo'lda sinxronlash ("Sync now") ───
export async function POST(req: Request) {
  const limited = limitOrReject(req, "pos-sync", { limit: 6, windowMs: WINDOW.minute });
  if (limited) return limited;

  const acc = await getPosOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);
  if (acc.error === "PLAN") return fail("POS integratsiyasi Business tarifda mavjud", 403);

  const integration = await prisma.posIntegration.findFirst({
    where: { restaurantId: acc.restaurant.id, isActive: true },
  });
  if (!integration) return fail("Faol POS integratsiyasi topilmadi", 404);

  const result = await syncMenu(integration.id);
  return ok(result);
}
