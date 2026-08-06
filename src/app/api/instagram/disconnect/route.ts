import { prisma } from "@/lib/prisma";
import { ok, fail, route } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";

// ─── Instagram akkauntini uzish (qoidalar saqlanadi) ───
export const POST = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  await prisma.instagramAccount.deleteMany({ where: { restaurantId: acc.restaurant.id } });
  return ok({ disconnected: true });
});
