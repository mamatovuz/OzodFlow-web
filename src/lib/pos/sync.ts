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
  /** POS'da o'chirilgani uchun avtomatik yashirilgan mahsulotlar soni */
  itemsHidden: number;
  message: string;
  logId: string;
}

// Bir vaqtda bir integratsiyani ikki marta sinxronlamaslik uchun qulf.
// (Qo'lda "Sync now" + avtomatik cron ustma-ust tushishi mumkin.)
// Railway'da bitta Node jarayoni bo'lgani uchun module-darajali Set yetarli.
const running = new Set<string>();

/** Bitta integratsiya bo'yicha menyuni sinxronlaydi */
export async function syncMenu(integrationId: string): Promise<SyncResult> {
  if (running.has(integrationId)) {
    return {
      ok: false,
      itemsSynced: 0,
      itemsFailed: 0,
      itemsHidden: 0,
      message: "Sinxronlash allaqachon bajarilmoqda, biroz kuting",
      logId: "",
    };
  }
  running.add(integrationId);
  try {
    return await runSync(integrationId);
  } finally {
    running.delete(integrationId);
  }
}

async function runSync(integrationId: string): Promise<SyncResult> {
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
  let hidden = 0;
  let ok = true;
  let message = "Menyu muvaffaqiyatli sinxronlandi";

  // POS'dan kelgan tashqi ID'lar — moslashda ko'rilganlarni belgilaymiz,
  // qolganlari POS'da o'chirilgan hisoblanadi va menyudan yashiriladi.
  const seenProductExtIds = new Set<string>();
  const seenCategoryExtIds = new Set<string>();

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
        seenCategoryExtIds.add(c.externalId);
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
            // POS'da yana paydo bo'lsa — avval yashirilgan bo'lsa ham qayta ko'rsatamiz
            isVisible: true,
          },
        });
        synced++;
        seenProductExtIds.add(p.externalId);
      } catch {
        failed++;
      }
    }

    // ── 3. POS'da o'chirilganlarni yashirish (stale cleanup) ──
    // Faqat menyu muvaffaqiyatli olingan bo'lsa ishlaydi. Xavfsizlik uchun
    // bo'sh menyu kelsa (API nosozligi) hech nima yashirmaymiz — aks holda
    // butun menyu yo'qolib qolishi mumkin.
    if (seenProductExtIds.size > 0) {
      hidden += await hideMissing(
        restaurantId,
        provider,
        seenProductExtIds,
        seenCategoryExtIds
      );
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

  // Yashirilganlar sonini xabarga qo'shamiz
  const fullMessage =
    ok && hidden > 0 ? `${message} (${hidden} ta POS'da o'chirilgani yashirildi)` : message;

  // ── Sync tarixiga yozish ──
  const log = await prisma.posSyncLog.create({
    data: {
      integrationId,
      type: "MENU",
      status: ok ? (failed > 0 ? "PARTIAL" : "SUCCESS") : "FAILED",
      itemsSynced: synced,
      itemsFailed: failed,
      message: fullMessage,
      durationMs: Date.now() - started,
    },
  });

  return {
    ok,
    itemsSynced: synced,
    itemsFailed: failed,
    itemsHidden: hidden,
    message: fullMessage,
    logId: log.id,
  };
}

/**
 * POS'da endi mavjud bo'lmagan (bu sinxronda ko'rilmagan) mahsulot va
 * kategoriyalarni menyudan yashiradi. Faqat POS boshqaradigan yozuvlarga
 * tegadi (owner qo'lda qo'shganlariga tegmaydi). SQLite parametr limitiga
 * urilmaslik uchun ID'lar bo'lakma-bo'lak yangilanadi.
 */
async function hideMissing(
  restaurantId: string,
  provider: PosProviderId,
  seenProducts: Set<string>,
  seenCategories: Set<string>
): Promise<number> {
  const CHUNK = 400;

  async function hideProductsByIds(ids: string[]) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      await prisma.product.updateMany({
        where: { id: { in: slice } },
        data: { isVisible: false, isAvailable: false, stockStatus: "OUT_OF_STOCK" },
      });
    }
  }

  // POS boshqaradigan mahsulotlar
  const managedProducts = await prisma.product.findMany({
    where: { restaurantId, posProvider: provider, posExternalId: { not: null } },
    select: { id: true, posExternalId: true, isVisible: true, isAvailable: true },
  });
  const staleProducts = managedProducts
    .filter(
      (p) =>
        p.posExternalId != null &&
        !seenProducts.has(p.posExternalId) &&
        (p.isVisible || p.isAvailable)
    )
    .map((p) => p.id);
  await hideProductsByIds(staleProducts);

  // POS boshqaradigan bo'sh (endi ko'rilmagan) kategoriyalar
  const managedCategories = await prisma.category.findMany({
    where: { restaurantId, posProvider: provider, posExternalId: { not: null } },
    select: { id: true, posExternalId: true, isVisible: true },
  });
  const staleCategories = managedCategories
    .filter(
      (c) => c.posExternalId != null && !seenCategories.has(c.posExternalId) && c.isVisible
    )
    .map((c) => c.id);
  for (let i = 0; i < staleCategories.length; i += CHUNK) {
    const slice = staleCategories.slice(i, i + CHUNK);
    await prisma.category.updateMany({
      where: { id: { in: slice } },
      data: { isVisible: false },
    });
  }

  return staleProducts.length;
}
