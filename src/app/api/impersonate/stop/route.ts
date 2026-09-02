import { getSessionUser, stopImpersonation } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

// "Adminga qaytish" — impersonation sessiyasidan chiqib, asl admin sessiyasini tiklaydi.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return fail("Avtorizatsiya talab qilinadi", 401);
  if (!user.impersonatedBy) return fail("Bu sessiya admin ko'rinishi emas", 400);

  const done = await stopImpersonation();
  if (!done) return fail("Qaytarib bo'lmadi", 400);
  return ok({ redirect: "/admins/restaurants" });
}
