import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";
import { randomPromoCode } from "@/lib/promo";

const USER_DISCOUNT = 3; // mijoz kodi chegirmasi (%)
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Mijozning promo kodlari
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const codes = await prisma.promoCode.findMany({
    where: { source: "USER", ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const last = codes[0];
  const canClaim = !last || Date.now() - new Date(last.createdAt).getTime() > YEAR_MS;
  const nextDate = last ? new Date(new Date(last.createdAt).getTime() + YEAR_MS) : null;

  return ok({ codes, canClaim, discountPercent: USER_DISCOUNT, nextDate });
}

// Yiliga 1 marta promo kod olish
export async function POST() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const last = await prisma.promoCode.findFirst({
    where: { source: "USER", ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - new Date(last.createdAt).getTime() < YEAR_MS) {
    return fail("Siz bu yil uchun promo kodni olgansiz. Keyingi yil qaytadan.", 409);
  }

  let code = randomPromoCode();
  while (await prisma.promoCode.findUnique({ where: { code } })) {
    code = randomPromoCode();
  }

  const promo = await prisma.promoCode.create({
    data: {
      code,
      discountPercent: USER_DISCOUNT,
      scope: "ALL",
      source: "USER",
      ownerId: user.id,
      maxUses: 1,
    },
  });
  return ok(promo, 201);
}
