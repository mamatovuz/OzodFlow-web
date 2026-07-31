import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";

// Zahiralangan slug'lar (marshrutlar bilan to'qnashmasligi uchun)
const RESERVED = new Set([
  "admin", "admins", "api", "dashboard", "login", "register", "staff",
  "m", "media", "receipt", "test", "www", "app", "robots", "sitemap",
  "manifest", "favicon",
]);

// Menyu manzilini (slug) tekshirish yoki o'zgartirish
// Body: { slug: string, check?: boolean }
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const raw = String(body?.slug || "");
  const slug = slugify(raw);

  if (!slug || slug.length < 3) {
    return fail("Manzil kamida 3 ta belgidan iborat bo'lishi kerak", 422);
  }
  if (slug.length > 40) return fail("Manzil juda uzun", 422);
  if (RESERVED.has(slug)) return fail("Bu manzil band, boshqasini tanlang", 409);

  if (slug === restaurant.slug) {
    return ok({ slug, available: true, current: true });
  }

  const taken = await prisma.restaurant.findFirst({
    where: { slug, NOT: { id: restaurant.id } },
    select: { id: true },
  });
  if (taken) {
    return fail("Bu manzil allaqachon band, boshqasini tanlang", 409);
  }

  // Faqat tekshirish rejimi — o'zgartirmaymiz
  if (body?.check) return ok({ slug, available: true });

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { slug },
    select: { slug: true },
  });
  return ok({ slug: updated.slug, available: true, saved: true });
}
