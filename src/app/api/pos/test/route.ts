import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { getPosOwner } from "@/lib/pos-access";
import { createPosProvider, isSupportedProvider, getProviderMeta } from "@/lib/pos";
import type { PosProviderId } from "@/lib/pos";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

const schema = z.object({
  provider: z.string(),
  credentials: z.record(z.string()),
});

// ─── Ulanishni tekshirish (saqlamasdan) ───
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "pos-test", { limit: 20, windowMs: WINDOW.minute });
  if (limited) return limited;

  const acc = await getPosOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);
  if (acc.error === "PLAN") return fail("POS integratsiyasi Business tarifda mavjud", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const { provider, credentials } = parsed.data;
  if (!isSupportedProvider(provider)) return fail("Provayder qo'llab-quvvatlanmaydi", 400);

  const meta = getProviderMeta(provider as PosProviderId);
  for (const f of meta?.credentialFields ?? []) {
    if (f.required && !credentials[f.key]?.trim()) return fail(`${f.label} kiritilmagan`, 422);
  }

  const client = createPosProvider(provider as PosProviderId, {
    credentials,
    restaurantId: acc.restaurant.id,
  });
  const result = await client.testConnection();
  return ok(result);
}
