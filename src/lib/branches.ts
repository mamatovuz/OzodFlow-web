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

// Noyob slug yaratish (register bilan bir xil mantiq)
export async function makeUniqueSlug(name: string) {
  const base = slugify(name) || "filial";
  let slug = base;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${base}-${randomCode(4).toLowerCase()}`;
  }
  return slug;
}
