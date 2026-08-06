/**
 * OzodFlow buyurtmasini restoranning ulangan POS tizimiga (Clopos ...) yuborish.
 *
 * Mijoz menyudan buyurtma berganda chaqiriladi. Restoranда faol POS
 * integratsiyasi bo'lsa — buyurtma POS ga uzatiladi. Xato bo'lsa mijoz
 * buyurtmasi BUZILMAYDI (OzodFlow o'z panelida buyurtmani baribir ko'rsatadi),
 * faqat `Order.posError` ga yoziladi.
 */
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";
import { createPosProvider } from "./registry";
import { decryptCredentials } from "./crypto";
import { posErrorMessage } from "./errors";
import type { PosProviderId, PosOrderInput } from "./types";

export interface OrderPushInput {
  id: string;
  restaurantId: string;
  tableCode: string | null;
  phone: string | null;
  comment: string | null;
  items: { productId: string; qty: number }[];
}

/** Buyurtmani faol POS ga yuboradi (agar ulangan bo'lsa). Hech qachon throw qilmaydi. */
export async function pushOrderToPos(order: OrderPushInput): Promise<void> {
  try {
    const integration = await prisma.posIntegration.findFirst({
      where: { restaurantId: order.restaurantId, isActive: true },
    });
    if (!integration) return; // POS ulanmagan — jimgina o'tamiz

    const provider = integration.provider as PosProviderId;

    // OzodFlow mahsulot ID → POS tashqi ID
    const ids = order.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, restaurantId: order.restaurantId, posProvider: provider },
      select: { id: true, posExternalId: true },
    });
    const extById = new Map(products.map((p) => [p.id, p.posExternalId]));

    const posItems = order.items
      .map((it) => {
        const ext = extById.get(it.productId);
        return ext ? { externalProductId: ext, qty: it.qty } : null;
      })
      .filter((x): x is { externalProductId: string; qty: number } => x !== null);

    if (posItems.length === 0) {
      await setPosError(order.id, "Buyurtmadagi mahsulotlar POS bilan bog'lanmagan");
      return;
    }

    const client = createPosProvider(provider, {
      credentials: decryptCredentials(integration.credentials),
      restaurantId: order.restaurantId,
    });
    if (!client.pushOrder) {
      await setPosError(order.id, "Bu POS buyurtma qabul qilishni qo'llab-quvvatlamaydi");
      return;
    }

    const input: PosOrderInput = {
      tableExternalId: null, // OzodFlow stollari POS stollari bilan hali bog'lanmagan
      items: posItems,
      comment: order.comment,
      phone: order.phone,
    };
    const result = await client.pushOrder(input);
    await prisma.order
      .update({ where: { id: order.id }, data: { posOrderId: result.externalOrderId, posError: null } })
      .catch(() => {});
  } catch (err) {
    log.warn("pos_order_push_failed", {
      orderId: order.id,
      restaurantId: order.restaurantId,
      err: err instanceof Error ? err.message : String(err),
    });
    await setPosError(order.id, posErrorMessage(err));
  }
}

async function setPosError(orderId: string, message: string) {
  await prisma.order.update({ where: { id: orderId }, data: { posError: message } }).catch(() => {});
}
