// Taplink uchun server-side (Prisma) yordamchilari.
// lib/taplink.ts SOF (prisma'siz) — client ham import qiladi; DB shu yerda.

import { prisma } from "./prisma";
import { generateHandle } from "./taplink";
import { isReservedSlug } from "./reserved-slugs";

// handle band emasmi: reserved emas + landing sahifa emas + boshqa taplink emas.
export async function isHandleTaken(handle: string, exceptRestaurantId?: string): Promise<boolean> {
  if (isReservedSlug(handle)) return true;
  const [landing, taplink] = await Promise.all([
    prisma.landingPage.findUnique({ where: { slug: handle }, select: { id: true } }),
    prisma.taplink.findUnique({
      where: { handle },
      select: { restaurantId: true },
    }),
  ]);
  if (landing) return true;
  if (taplink && taplink.restaurantId !== exceptRestaurantId) return true;
  return false;
}

// Restoranning taplinkini oladi; yo'q bo'lsa yaratadi (handle avtomatik nomdan).
export async function getOrCreateTaplink(restaurant: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  telegram: string | null;
  instagram: string | null;
}) {
  const existing = await prisma.taplink.findUnique({ where: { restaurantId: restaurant.id } });
  if (existing) return existing;

  const handle = await generateHandle(
    restaurant.name || restaurant.slug,
    (h) => isHandleTaken(h, restaurant.id)
  );

  // Restoran profilidan mavjud kontaktlarni tugmalarga oldindan joylaymiz
  const links: { id: string; type: string; label: string; value: string }[] = [];
  let i = 0;
  if (restaurant.phone) links.push({ id: `l${i++}`, type: "phone", label: "", value: restaurant.phone });
  if (restaurant.telegram) links.push({ id: `l${i++}`, type: "telegram", label: "", value: restaurant.telegram });
  if (restaurant.instagram) links.push({ id: `l${i++}`, type: "instagram", label: "", value: restaurant.instagram });

  return prisma.taplink.create({
    data: {
      restaurantId: restaurant.id,
      handle,
      displayName: restaurant.name,
      logo: restaurant.logo,
      links: JSON.stringify(links),
    },
  });
}
