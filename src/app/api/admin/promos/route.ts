import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

// Admin promo kodlari + analitika
export async function GET() {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const promos = await prisma.promoCode.findMany({
    where: { source: "ADMIN" },
    orderBy: { createdAt: "desc" },
  });

  // Har kod bo'yicha tasdiqlangan to'lovlar: necha kishi, qancha ziyon
  const stats = await prisma.paymentRequest.groupBy({
    by: ["promoCode"],
    where: { status: "APPROVED", promoCode: { not: null } },
    _count: { _all: true },
    _sum: { discount: true, amount: true },
  });
  const statMap = new Map(
    stats.map((s) => [
      s.promoCode,
      { paidCount: s._count._all, totalDiscount: s._sum.discount ?? 0, totalRevenue: s._sum.amount ?? 0 },
    ])
  );

  const data = promos.map((p) => ({
    ...p,
    paidCount: statMap.get(p.code)?.paidCount ?? 0,
    totalDiscount: statMap.get(p.code)?.totalDiscount ?? 0,
    totalRevenue: statMap.get(p.code)?.totalRevenue ?? 0,
  }));

  return ok(data);
}

// Yangi admin promo kod
// Body: { code?, discountPercent, scope?, maxUses? }
export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard();
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const discountPercent = Number(body?.discountPercent);
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return fail("Chegirma foizi 1-100 orasida bo'lishi kerak", 422);
  }
  const scope = ["ALL", "PRO", "PROMAX"].includes(body?.scope) ? body.scope : "ALL";
  const maxUses = body?.maxUses ? Math.max(1, Number(body.maxUses)) : null;

  let code = (body?.code || "").trim().toUpperCase();
  if (!code) {
    return fail("Kodni kiriting", 422);
  }
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    return fail("Kod 3-20 belgi (harflar, raqamlar, -)", 422);
  }
  const exists = await prisma.promoCode.findUnique({ where: { code } });
  if (exists) return fail("Bu kod allaqachon mavjud", 409);

  const promo = await prisma.promoCode.create({
    data: { code, discountPercent, scope, source: "ADMIN", maxUses },
  });
  return ok(promo, 201);
}
