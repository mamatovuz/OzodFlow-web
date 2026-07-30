import { prisma } from "@/lib/prisma";
import { authGuard, ok } from "@/lib/api";

// Foydalanuvchi to'lov qilishi uchun faol kartalar ro'yxati
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const cards = await prisma.paymentCard.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, bankName: true, cardNumber: true, cardHolder: true },
  });
  return ok(cards);
}
