import { prisma } from "./prisma";
import { slugify, randomCode } from "./utils";
import { FREE_BRANCHES, getEffectivePlan } from "./plans";

// Egaga tegishli filiallar holati: nechta bor, nechta bepul qo'shsa bo'ladi,
// keyingisi uchun to'lov kerakmi. Bepul limit = FREE_BRANCHES + tasdiqlangan
// qo'shimcha filial to'lovlari soni.
export async function getBranchInfo(ownerId: string) {
  const [restaurants, approvedExtra] = await Promise.all([
    prisma.restaurant.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, plan: true, planUntil: true },
    }),
    prisma.paymentRequest.count({
      where: { userId: ownerId, kind: "BRANCH", status: "APPROVED" },
    }),
  ]);
  const main = restaurants[0] ?? null;
  const access = main ? getEffectivePlan(main) : null;
  const canBranches = !!access?.canBranches;
  const ownedCount = restaurants.length;
  const addedBranches = Math.max(0, ownedCount - 1); // asosiy hisobdan tashqari
  const allowance = FREE_BRANCHES + approvedExtra; // bepul + to'langan qo'shimcha
  return {
    main,
    canBranches,
    ownedCount,
    addedBranches,
    allowance,
    // Yangi filialni bepul qo'shsa bo'ladimi (Business + limit ichida)
    canAddFree: canBranches && addedBranches < allowance,
    approvedExtra,
  };
}

// Asosiy filial menyusini (dizayn + kategoriya + mahsulotlar) yangi filialga ko'chirish.
// POS maydonlari nusxalanmaydi (bog'lanish alohida), ko'rishlar 0 dan boshlanadi.
export async function cloneMenuToBranch(fromId: string, toId: string) {
  const from = await prisma.restaurant.findUnique({
    where: { id: fromId },
    select: {
      menuTheme: true,
      designConfig: true,
      primaryColor: true,
      purchasedThemes: true,
      currency: true,
      logo: true,
      cover: true,
    },
  });
  if (!from) return;

  // 1) Menyu dizayni (tema, ranglar, moslama, logo/muqova)
  await prisma.restaurant.update({
    where: { id: toId },
    data: {
      menuTheme: from.menuTheme,
      designConfig: from.designConfig,
      primaryColor: from.primaryColor,
      purchasedThemes: from.purchasedThemes,
      currency: from.currency,
      logo: from.logo,
      cover: from.cover,
    },
  });

  // 2) Kategoriyalar — eski→yangi id xaritasi bilan
  const categories = await prisma.category.findMany({
    where: { restaurantId: fromId },
    orderBy: { sortOrder: "asc" },
  });
  const idMap = new Map<string, string>();
  for (const c of categories) {
    const created = await prisma.category.create({
      data: {
        restaurantId: toId,
        name: c.name,
        nameRu: c.nameRu,
        nameEn: c.nameEn,
        description: c.description,
        icon: c.icon,
        image: c.image,
        sortOrder: c.sortOrder,
        isVisible: c.isVisible,
      },
    });
    idMap.set(c.id, created.id);
  }

  // 3) Mahsulotlar — yangi kategoriya id'siga bog'lab
  const products = await prisma.product.findMany({
    where: { restaurantId: fromId },
    orderBy: { sortOrder: "asc" },
  });
  for (const p of products) {
    const newCat = idMap.get(p.categoryId);
    if (!newCat) continue;
    await prisma.product.create({
      data: {
        restaurantId: toId,
        categoryId: newCat,
        name: p.name,
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        description: p.description,
        descriptionRu: p.descriptionRu,
        descriptionEn: p.descriptionEn,
        images: p.images,
        crop: p.crop,
        price: p.price,
        oldPrice: p.oldPrice,
        ingredients: p.ingredients,
        weight: p.weight,
        calories: p.calories,
        spicyLevel: p.spicyLevel,
        isVegetarian: p.isVegetarian,
        isHalal: p.isHalal,
        isNew: p.isNew,
        isBestseller: p.isBestseller,
        isRecommended: p.isRecommended,
        isAvailable: p.isAvailable,
        isVisible: p.isVisible,
        sortOrder: p.sortOrder,
        // POS bog'lanishi va statistika nusxalanmaydi
      },
    });
  }
}

// Noyob slug yaratish (register bilan bir xil mantiq)
export async function makeUniqueSlug(name: string) {
  const base = slugify(name) || "filial";
  let slug = base;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${base}-${randomCode(4).toLowerCase()}`;
  }
  return slug;
}
