import { NextRequest } from "next/server";
import { authGuard, isOwner, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBranchInfo, makeUniqueSlug } from "@/lib/branches";

// Yangi filial (restoran) qo'shish — faqat egasi, Business tarifida, limit ichida.
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  if (!(await isOwner(user.id)))
    return fail("Faqat restoran egasi filial qo'sha oladi", 403);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (name.length < 2) return fail("Filial nomini kiriting (kamida 2 harf)");

  const info = await getBranchInfo(user.id);
  if (!info.canBranches)
    return fail("Filiallar faqat Business tarifida mavjud. Avval tarifni yangilang.", 403, {
      needsPlan: true,
    });
  if (!info.canAddFree)
    return fail(
      `Bepul filiallar limiti (${info.allowance}) to'ldi. Yangi filial uchun to'lov kerak.`,
      402,
      { needsPayment: true }
    );

  const slug = await makeUniqueSlug(name);
  const branch = await prisma.restaurant.create({
    data: {
      ownerId: user.id,
      name,
      slug,
      // Filial asosiy hisob obunasi bilan birga ishlaydi
      plan: info.main?.plan ?? "BUSINESS",
      planUntil: info.main?.planUntil ?? null,
    },
  });
  return ok({ id: branch.id, slug: branch.slug }, 201);
}
