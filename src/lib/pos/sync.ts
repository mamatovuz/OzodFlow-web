/**
 * POS → OzodFlow menyu sinxronizatsiyasi.
 *
 * Provayderdan normallashtirilgan menyuni oladi va DB'ga upsert qiladi.
 * Moslash kaliti: (restaurantId, posProvider, posExternalId) — shu tufayli
 * restoran mahsulotni ikki marta kiritmaydi va qayta sync mavjudini yangilaydi.
 *
 * Har sync `PosSyncLog` ga yoziladi (tarix + konflikt/xato ko'rinadi).
 */
import { prisma } from "@/lib/prisma";
import { createPosProvider } from "./registry";
import { decryptCredentials } from "./crypto";
import { PosError, posErrorMessage } from "./errors";
import type { PosProviderId, PosMenu } from "./types";

export interface SyncResult {
  ok: boolean;
  itemsSynced: number;
  itemsFailed: number;
  message: string;
  logId: string;
}

/** Bitta integratsiya bo'yicha menyuni sinxronlaydi */
export async function syncMenu(integrationId: string): Promise<SyncResult> {
  const started = Date.now();
  const integration = await prisma.posIntegration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) {
    throw new PosError("NOT_FOUND", "Integratsiya topilmadi");
  }

  const provider = integration.provider as PosProviderId;
  const restaurantId = integration.restaurantId;

  let synced = 0;
  let failed = 0;
  let ok = true;
  let message = "Menyu muvaffaqiyatli sinxronlandi";

  try {
    const credentials = decryptCredentials(integration.credentials);
    const client = createPosProvider(provider, { credentials, restaurantId });
    const menu: PosMenu = await client.fetchMenu();

    // ── 1. Kategoriyalar ──
    const catIdByExternal = new Map<string, string>();
    for (const c of menu.categories) {
      try {
        const saved = await prisma.category.upsert({
          where: {
            restaurantId_posProvider_posExternalId: {
              restaurantId,
              posProvider: provider,
              posExternalId: c.externalId,
            },
          },
          create: {
            restaurantId,
            name: c.name,
            sortOrder: c.sortOrder ?? 0,
            isVisible: c.isVisible ?? true,
            posProvider: provider,
            posExternalId: c.externalId,
          },
          update: {
            name: c.name,
            sortOrder: c.sortOrder ?? 0,
            isVisible: c.isVisible ?? true,
          },
        });
        catIdByExternal.set(c.externalId, saved.id);
      } catch {
        failed++;
      }
    }

    // ── 2. Mahsulotlar ──
    for (const p of menu.products) {
      const categoryId = p.categoryExternalId
        ? catIdByExternal.get(p.categoryExternalId)
        : undefined;
      if (!categoryId) {
        // Kategoriyasi topilmadi — konflikt, o'tkazib yuboramiz
        failed++;
        continue;
      }
      try {
        await prisma.product.upsert({
          where: {
            restaurantId_posProvider_posExternalId: {
              restaurantId,
              posProvider: provider,
              posExternalId: p.externalId,
            },
          },
          create: {
            restaurantId,
            categoryId,
            name: p.name,
            description: p.description ?? null,
            price: p.price,
            oldPrice: p.oldPrice ?? null,
            weight: p.weight ?? null,
            calories: p.calories ?? null,
            images: p.imageUrl ? JSON.stringify([p.imageUrl]) : null,
            isAvailable: p.isAvailable,
            stockStatus: p.stockStatus ?? null,
            sortOrder: p.sortOrder ?? 0,
            posProvider: provider,
            posExternalId: p.externalId,
          },
          update: {
            // Narx, holat va ombor — POS "haqiqat manbai" bo'lgani uchun yangilanadi.
            // Nom/tavsif/rasm faqat bo'sh bo'lsa yangilanmaydi (owner tahriri saqlanadi).
            categoryId,
            price: p.price,
            oldPrice: p.oldPrice ?? null,
            isAvailable: p.isAvailable,
            stockStatus: p.stockStatus ?? null,
          },
        });
        synced++;
      } catch {
        failed++;
      }
    }
  } catch (err) {
    ok = false;
    message = posErrorMessage(err);
  }

  // ── Integratsiya holatini yangilash ──
  await prisma.posIntegration.update({
    where: { id: integrationId },
    data: {
      status: ok ? "CONNECTED" : "ERROR",
      lastError: ok ? null : message,
      lastSyncAt: new Date(),
    },
  });

  // ── Sync tarixiga yozish ──
  const log = await prisma.posSyncLog.create({
    data: {
      integrationId,
      type: "MENU",
      status: ok ? (failed > 0 ? "PARTIAL" : "SUCCESS") : "FAILED",
      itemsSynced: synced,
      itemsFailed: failed,
      message,
      durationMs: Date.now() - started,
    },
  });

  return { ok, itemsSynced: synced, itemsFailed: failed, message, logId: log.id };
}
