import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authGuard, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Faol filialni tanlash — cookie'ga yoziladi (foydalanuvchi kirish huquqiga ega bo'lsa).
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const body = await req.json().catch(() => ({}));
  const restaurantId = String(body.restaurantId || "");
  if (!restaurantId) return fail("restaurantId kerak");

  // Faqat egasi yoki a'zosi bo'lgan restoranga o'tishga ruxsat
  const allowed = await prisma.restaurant.findFirst({
    where: {
      AND: [
        { id: restaurantId },
        { OR: [{ ownerId: user.id }, { memberships: { some: { userId: user.id } } }] },
      ],
    },
    select: { id: true },
  });
  if (!allowed) return fail("Filial topilmadi yoki ruxsat yo'q", 404);

  const store = await cookies();
  store.set("ozf_branch", allowed.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return ok({ id: allowed.id });
}
