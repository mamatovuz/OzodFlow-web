import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authGuard, isOwner, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Filialni (qo'shimcha restoranni) o'chirish — faqat egasi.
// Asosiy (birinchi yaratilgan) filialni o'chirib bo'lmaydi.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await authGuard();
  if (!user) return res;
  if (!(await isOwner(user.id)))
    return fail("Faqat restoran egasi filialni o'chira oladi", 403);

  const { id } = await params;

  const owned = await prisma.restaurant.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const target = owned.find((r) => r.id === id);
  if (!target) return fail("Filial topilmadi yoki ruxsat yo'q", 404);
  if (owned.length <= 1) return fail("Yagona filialni o'chirib bo'lmaydi", 422);
  if (owned[0].id === id)
    return fail("Asosiy filialni o'chirib bo'lmaydi. Avval boshqa filialni asosiy qiling.", 422);

  // Restoran o'chirilsa — menyu, buyurtma, stollar va h.k. cascade bilan o'chadi.
  await prisma.restaurant.delete({ where: { id } });

  // Agar o'chirilgan filial faol tanlangan bo'lsa — cookie'ni tozalaymiz.
  const store = await cookies();
  if (store.get("ozf_branch")?.value === id) store.delete("ozf_branch");

  return ok({ deleted: true });
}
