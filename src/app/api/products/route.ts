import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { productSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const search = req.nextUrl.searchParams.get("q");

  const products = await prisma.product.findMany({
    where: {
      restaurantId: restaurant.id,
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { category: { select: { name: true } } },
  });

  return ok(products);
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  // Kategoriya shu restoranga tegishlimi
  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, restaurantId: restaurant.id },
  });
  if (!category) return fail("Kategoriya topilmadi", 404);

  // FREE tarif limiti: 20 mahsulot
  if (restaurant.plan === "FREE") {
    const count = await prisma.product.count({
      where: { restaurantId: restaurant.id },
    });
    if (count >= 20) {
      return fail(
        "Free tarifda 20 tagacha mahsulot qo'shish mumkin. Pro tarifga o'ting.",
        403
      );
    }
  }

  const { images, ...rest } = parsed.data;
  const product = await prisma.product.create({
    data: {
      ...rest,
      restaurantId: restaurant.id,
      images: images ? JSON.stringify(images) : null,
    },
  });

  return ok(product, 201);
}
