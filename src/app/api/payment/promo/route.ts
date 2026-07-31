import { NextRequest } from "next/server";
import { authGuard, ok, fail } from "@/lib/api";
import { validatePromo } from "@/lib/promo";

// Promo kodni tekshirish (checkout'da)
// Body: { code, plan }
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const code = body?.code || "";
  const plan = body?.plan || "STARTER";

  const result = await validatePromo(code, user.id, plan);
  if (!result.valid) return fail(result.reason, 422);
  return ok({ discountPercent: result.discountPercent, code: result.code });
}
