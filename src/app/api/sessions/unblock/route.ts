import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, authGuard, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ fingerprint: z.string().min(1) });

// Bloklangan qurilmani qora ro'yxatdan chiqarish (endi qayta kira oladi).
export const POST = route(async (req) => {
  const { user, res } = await authGuard();
  if (res) return res;

  const { fingerprint } = await readJson(req, schema);

  await prisma.blockedDevice.deleteMany({ where: { userId: user!.id, fingerprint } });
  return ok({ unblocked: true });
});
