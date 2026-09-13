import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, getMembership, ok, fail } from "@/lib/api";
import { getOpenShift } from "@/lib/shifts";
import { discountNeedsApproval } from "@/lib/staff";
import { verifyManagerPin } from "@/lib/approvals";

// Ofitsant stol hisobini to'laydi — naqd, karta yoki aralash.
// Chegirma va xizmat haqi (bo'lsa) yakuniy summaga qo'llanadi.
// Stolning barcha to'lanmagan buyurtmalari PAID + DELIVERED bo'ladi.
const schema = z.object({
  tableCode: z.string().min(1),
  method: z.enum(["CASH", "CARD", "MIXED"]),
  cash: z.number().min(0).optional(),
  card: z.number().min(0).optional(),
  // Chegirma: summa (so'm) va turi (audit uchun)
  discount: z.number().min(0).optional(),
  discountType: z.enum(["PERCENT", "AMOUNT"]).optional(),
  // Xizmat haqi: summa (so'm)
  service: z.number().min(0).optional(),
  // Manager PIN — chegirma waiter limitidan oshsa tasdiqlash uchun
  approverPin: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);
  const { tableCode, method } = parsed.data;

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      tableCode,
      paymentStatus: "UNPAID",
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, total: true, items: true, number: true, tableName: true },
  });
  if (orders.length === 0) return fail("To'lanmagan buyurtma yo'q", 404);

  const subtotal = orders.reduce((s, o) => s + o.total, 0);

  // Chegirma va xizmat haqini chegaralaymiz (summadan oshmasin)
  const discount = Math.min(Math.max(0, parsed.data.discount ?? 0), subtotal);
  const service = Math.max(0, parsed.data.service ?? 0);
  const total = Math.max(0, subtotal - discount + service);

  // ─── Chegirma limiti: waiter limitidan oshsa manager PIN talab qilinadi ───
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const isOwner = restaurant.ownerId === user.id;
  let approvedBy: string | null = null;
  if (!isOwner && discount > 0) {
    const membership = await getMembership(user.id);
    const role = membership?.role ?? "WAITER";
    if (discountNeedsApproval(role, discountPercent)) {
      approvedBy = await verifyManagerPin(restaurant.id, parsed.data.approverPin);
      if (!approvedBy) {
        return fail(
          `Chegirma ${discountPercent.toFixed(0)}% — bu limitdan oshdi. Manager PIN kiriting.`,
          403
        );
      }
    }
  }

  // To'lov qismlarini aniqlaymiz
  let paidCash = 0;
  let paidCard = 0;
  if (method === "CASH") paidCash = total;
  else if (method === "CARD") paidCard = total;
  else {
    paidCash = Math.max(0, parsed.data.cash ?? 0);
    paidCard = Math.max(0, parsed.data.card ?? 0);
    // Aralashda qismlar jami yakuniy summaga teng bo'lishi kerak (kichik xatoga yo'l qo'yamiz)
    if (Math.abs(paidCash + paidCard - total) > 1) {
      return fail(`Naqd va karta yig'indisi ${total} bo'lishi kerak`, 422);
    }
  }

  const paidAt = new Date();

  // Ochiq smena bo'lsa — to'lovni unga bog'laymiz (kassa hisobi uchun)
  const shift = await getOpenShift(restaurant.id, user.id);
  const shiftId = shift?.id ?? null;

  // Chegirma/xizmat haqi farqini (delta) oxirgi buyurtmaga yozamiz — shunda
  // stol bo'yicha sum(total) yakuniy summaga (haqiqiy tushum) teng bo'ladi.
  const delta = service - discount; // total - subtotal
  const lastId = orders[orders.length - 1].id;
  const lastOrder = orders[orders.length - 1];

  await prisma.$transaction([
    // Barcha buyurtmalarni to'langan + yetkazilgan qilamiz
    prisma.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: {
        paymentStatus: "PAID",
        paymentMethod: method,
        paidAt,
        status: "DELIVERED",
        shiftId,
      },
    }),
    // Chegirma/servis ma'lumotini va delta bilan tuzatilgan total'ni oxirgi buyurtmaga yozamiz
    prisma.order.update({
      where: { id: lastId },
      data: {
        total: Math.max(0, lastOrder.total + delta),
        discount,
        discountType: parsed.data.discountType ?? (discount > 0 ? "AMOUNT" : null),
        serviceCharge: service,
        // To'lov qismlarini oxirgi buyurtmaga yozamiz (chek uchun)
        paidCash,
        paidCard,
        ...(approvedBy ? { approvedBy } : {}),
      },
    }),
  ]);

  // Chek uchun — stolning barcha taomlarini birlashtiramiz
  type ItemLite = { name?: string; qty?: number; price?: number };
  const receiptItems: ItemLite[] = orders.flatMap((o) => {
    try {
      return JSON.parse(o.items || "[]") as ItemLite[];
    } catch {
      return [];
    }
  });

  return ok({
    count: orders.length,
    subtotal,
    discount,
    service,
    total,
    method,
    paidCash,
    paidCard,
    // Chek chop etish uchun
    receipt: {
      number: lastOrder.number,
      tableName: lastOrder.tableName,
      items: receiptItems,
      restaurant: {
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        currency: restaurant.currency,
      },
      paidAt: paidAt.toISOString(),
    },
  });
}
