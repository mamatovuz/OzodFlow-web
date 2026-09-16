import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";
import { PLAN_DAYS, PLANS, type PlanKey } from "@/lib/plans";

// Bosh admin: restoranni bloklash/blokdan chiqarish YOKI tarif/muddatni o'zgartirish
//  - Blok:   { isBlocked: boolean, reason?: string }
//  - Tarif:  { action: "setPlan", plan, mode: "months"|"date"|"lifetime", months?, untilDate? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("restaurants");
  if (!user) return res;
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);

  // ─── Tarif va muddatni admin qo'lda belgilaydi (uzaytirish/umrbod/sana) ───
  if (body?.action === "setPlan") {
    const plan = body.plan as PlanKey;
    if (!plan || !PLANS[plan]) return fail("Tarif noto'g'ri", 422);
    const mode = body.mode as "months" | "date" | "lifetime";

    let planUntil: Date | null;
    if (plan === "FREE") {
      // Sinov tarifi — mode bo'yicha muddat (yoki bugundan)
      planUntil = resolveUntil(mode, body, restaurant.planUntil, plan, restaurant.plan);
    } else if (mode === "lifetime") {
      planUntil = null; // umrbod
    } else if (mode === "date") {
      const d = new Date(body.untilDate);
      if (isNaN(d.getTime())) return fail("Sana noto'g'ri", 422);
      planUntil = d;
    } else {
      // months — joriy muddatdan uzaytiramiz (agar shu tarif faol bo'lsa)
      const months = Number(body.months);
      if (!Number.isFinite(months) || months < 1 || months > 600) {
        return fail("Oy soni noto'g'ri", 422);
      }
      planUntil = resolveUntil("months", { months }, restaurant.planUntil, plan, restaurant.plan);
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: { plan, planUntil },
    });
    return ok({ id: updated.id, plan: updated.plan, planUntil: updated.planUntil });
  }

  // ─── Blok / blokdan chiqarish ───
  if (typeof body?.isBlocked !== "boolean") return fail("isBlocked kerak", 422);

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      isBlocked: body.isBlocked,
      blockReason: body.isBlocked ? (body.reason || null) : null,
    },
  });
  return ok({ id: updated.id, isBlocked: updated.isBlocked });
}

// Muddatni hisoblaydi: agar shu tarif hozir faol bo'lsa — joriy muddat ustiga
// qo'shadi, aks holda bugundan boshlaydi.
function resolveUntil(
  mode: "months" | "date" | "lifetime",
  body: { months?: number; untilDate?: string },
  currentUntil: Date | null,
  newPlan: string,
  currentPlan: string
): Date | null {
  if (mode === "lifetime") return null;
  const now = new Date();
  if (mode === "date" && body.untilDate) {
    const d = new Date(body.untilDate);
    return isNaN(d.getTime()) ? now : d;
  }
  const months = Number(body.months) || 1;
  const cur = currentUntil ? new Date(currentUntil) : null;
  const base = cur && cur > now && currentPlan === newPlan ? cur : now;
  return new Date(base.getTime() + months * PLAN_DAYS * 24 * 60 * 60 * 1000);
}

// Bosh admin: restoranni butunlay o'chirish (barcha bog'liq ma'lumotlar bilan)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await adminGuard("restaurants");
  if (!user) return res;
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  // Restoran o'chiriladi (cascade bilan menyu, buyurtma va h.k. ham o'chadi)
  await prisma.restaurant.delete({ where: { id } });

  // Agar egada boshqa restoran qolmagan bo'lsa — foydalanuvchi hisobini ham o'chiramiz
  const owner = await prisma.user.findUnique({
    where: { id: restaurant.ownerId },
    select: { role: true, _count: { select: { restaurants: true } } },
  });
  if (owner && owner.role !== "ADMIN" && owner._count.restaurants === 0) {
    await prisma.user.delete({ where: { id: restaurant.ownerId } }).catch(() => {});
  }

  return ok({ deleted: true });
}
