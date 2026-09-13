// ─────────────────────────────────────────────
// Smena (shift) — kassa hisobi.
// Ofitsant/kassir smenani ochadi (boslang'ich kassa), smena davomida to'lovlar
// ochiq smenaga bog'lanadi, yopishda naqd/karta tushum va farq hisoblanadi.
// ─────────────────────────────────────────────
import { prisma } from "./prisma";

// Xodimning hozirgi ochiq smenasi (bo'lsa)
export async function getOpenShift(restaurantId: string, staffId: string) {
  return prisma.shift.findFirst({
    where: { restaurantId, staffId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
}

// Ochiq smena bo'yicha jonli tushum — shiftId bog'langan to'langan buyurtmalardan.
// paidCash/paidCard faqat to'lov paytidagi "oxirgi" buyurtmaga yoziladi, shuning
// uchun ularni yig'indisi = smenadagi haqiqiy naqd/karta tushum.
export async function shiftTotals(shiftId: string) {
  const orders = await prisma.order.findMany({
    where: { shiftId, paymentStatus: "PAID" },
    select: { paidCash: true, paidCard: true },
  });
  let cashSales = 0;
  let cardSales = 0;
  for (const o of orders) {
    cashSales += o.paidCash ?? 0;
    cardSales += o.paidCard ?? 0;
  }
  // ordersCount — to'langan "chek" soni (paidCash yoki paidCard yozilgan buyurtmalar)
  const ordersCount = orders.filter(
    (o) => (o.paidCash ?? 0) > 0 || (o.paidCard ?? 0) > 0
  ).length;
  return { cashSales, cardSales, ordersCount };
}
