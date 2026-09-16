import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { slugify, randomCode } from "@/lib/utils";

// Onboarding'ni yakunlaydi: restoran nomini (va slug'ini) belgilaydi,
// onboarded=true qiladi. Tarif tanlash (to'lov) alohida — client paid tarifda
// /api/payment/inpay ni chaqiradi. FREE tarif esa shu yerda faol qoladi (30 kun).
// Body: { name }
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (name.length < 2) return fail("Restoran nomi kamida 2 belgi", 422);

  // Noyob slug (agar hozirgisi placeholder bo'lsa — nomdan yangisini yasaymiz)
  let slug = restaurant.slug;
  if (!restaurant.onboarded) {
    const baseSlug = slugify(name) || "restoran";
    slug = baseSlug;
    while (
      await prisma.restaurant.findFirst({
        where: { slug, id: { not: restaurant.id } },
      })
    ) {
      slug = `${baseSlug}-${randomCode(4).toLowerCase()}`;
    }
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { name: name.slice(0, 100), slug, onboarded: true },
  });

  return ok({ onboarded: true, slug });
}
