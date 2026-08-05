import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

/**
 * Restoran statistikasini nolga qaytaradi (qaytarib bo'lmaydigan amal).
 * O'chiriladi: QR skanerlar, barcha buyurtmalar, mahsulot ko'rish soni, stol skanlari.
 * Natijada dashboard'dagi barcha ko'rsatkichlar (skan, daromad, faol buyurtma) 0 ga tushadi.
 * Faqat restoran egasi bajarishi mumkin.
 */
export async function POST() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  if (restaurant.ownerId !== user.id) {
    return fail("Bu amalni faqat restoran egasi bajara oladi", 403);
  }

  const restaurantId = restaurant.id;

  const [scans, orders, services, views, tableScans] = await prisma.$transaction([
    // QR skan hodisalari
    prisma.scanEvent.deleteMany({ where: { restaurantId } }),
    // Barcha buyurtmalar (faol buyurtmalar, daromad shu yerdan)
    prisma.order.deleteMany({ where: { restaurantId } }),
    // Ofitsiant/hisob chaqiruvlari
    prisma.serviceCall.deleteMany({ where: { restaurantId } }),
    // Mahsulot ko'rishlar soni 0 ga
    prisma.product.updateMany({ where: { restaurantId }, data: { views: 0 } }),
    // Har bir stolning skan soni 0 ga
    prisma.restaurantTable.updateMany({ where: { restaurantId }, data: { scans: 0 } }),
  ]);

  return ok({
    scansDeleted: scans.count,
    ordersDeleted: orders.count,
    servicesDeleted: services.count,
    productsReset: views.count,
    tablesReset: tableScans.count,
  });
}
