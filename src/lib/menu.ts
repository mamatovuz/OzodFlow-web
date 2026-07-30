import { prisma } from "./prisma";
import { getTheme } from "./themes";

async function buildMenu(restaurant: NonNullable<Awaited<ReturnType<typeof prisma.restaurant.findUnique>>>) {
  const [categories, products, banners] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId: restaurant.id, isVisible: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { restaurantId: restaurant.id, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.banner.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return {
    restaurant,
    categories,
    products,
    banners,
    theme: getTheme(restaurant.menuTheme),
  };
}

export async function getMenuBySlug(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !restaurant.isActive) return null;
  return buildMenu(restaurant);
}

export async function getMenuByDomain(domain: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { customDomain: domain.toLowerCase() },
  });
  if (!restaurant || !restaurant.isActive) return null;
  return buildMenu(restaurant);
}

// QR koddagi stolni aniqlaydi (?t=CODE)
export async function resolveTable(
  restaurantId: string,
  code: string | undefined
): Promise<{ code: string; name: string } | null> {
  if (!code) return null;
  const t = await prisma.restaurantTable.findFirst({
    where: { code, restaurantId },
    select: { code: true, name: true },
  });
  return t ?? null;
}
