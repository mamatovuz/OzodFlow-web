import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { IMPORT_COLUMNS, mapHeaders, parseNumber } from "@/lib/excel-import";
import { storeRemoteImage, mapWithConcurrency } from "@/lib/image-fetch";
import { readSheet } from "read-excel-file/node";

export const dynamic = "force-dynamic";

type SkippedRow = { row: number; reason: string };

function normName(v: unknown): string {
  return String(v ?? "").trim();
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v.trim());
}

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  // Faylni olish
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Excel fayl yuborilmadi", 400);
  if (file.size > 5 * 1024 * 1024) return fail("Fayl hajmi 5MB dan oshmasin", 400);

  // Excel'ni o'qish
  let rows: unknown[][];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = (await readSheet(buffer)) as unknown[][];
  } catch {
    return fail("Faylni o'qib bo'lmadi. Bu haqiqiy .xlsx (Excel) faylmi?", 400);
  }

  // Bo'sh bo'lmagan birinchi qatorni sarlavha deb olamiz
  const headerIdx = rows.findIndex((r) => r.some((c) => normName(c) !== ""));
  if (headerIdx === -1) return fail("Fayl bo'sh", 400);

  const headerMap = mapHeaders(rows[headerIdx]);

  // Majburiy ustunlar bormi?
  const missing = IMPORT_COLUMNS.filter(
    (c) => c.required && headerMap[c.key] === -1
  ).map((c) => c.header);
  if (missing.length > 0) {
    return fail(
      `Quyidagi ustunlar topilmadi: ${missing.join(", ")}. Iltimos, shablondan foydalaning.`,
      422
    );
  }

  const cell = (row: unknown[], key: keyof typeof headerMap): unknown => {
    const i = headerMap[key];
    return i >= 0 ? row[i] : undefined;
  };

  // Mavjud kategoriyalar: normallashtirilgan nom -> id
  const existingCats = await prisma.category.findMany({
    where: { restaurantId: restaurant.id },
    select: { id: true, name: true },
  });
  const catByName = new Map<string, string>();
  for (const c of existingCats) catByName.set(c.name.trim().toLowerCase(), c.id);

  // Qatorlarni tahlil qilish
  const skipped: SkippedRow[] = [];
  const warnings: string[] = [];
  const newCatNames = new Map<string, string>(); // lower -> asl nom
  type Parsed = {
    excelRow: number;
    categoryKey: string;
    name: string;
    price: number;
    oldPrice: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
  };
  const parsed: Parsed[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 1; // Excel 1-indeksli
    const isEmpty = !row || row.every((c) => normName(c) === "");
    if (isEmpty) continue;

    const category = normName(cell(row, "category"));
    const name = normName(cell(row, "name"));
    const price = parseNumber(cell(row, "price"));

    if (!category) {
      skipped.push({ row: excelRow, reason: "Kategoriya bo'sh" });
      continue;
    }
    if (!name) {
      skipped.push({ row: excelRow, reason: "Mahsulot nomi bo'sh" });
      continue;
    }
    if (price === null || price < 0) {
      skipped.push({ row: excelRow, reason: "Narx noto'g'ri yoki bo'sh" });
      continue;
    }

    const oldPrice = parseNumber(cell(row, "oldPrice"));
    const weight = normName(cell(row, "weight")) || null;
    const description = normName(cell(row, "description")) || null;
    let imageUrl = normName(cell(row, "imageUrl")) || null;
    if (imageUrl && !isHttpUrl(imageUrl)) {
      warnings.push(
        `${excelRow}-qator: rasm manzili noto'g'ri (https:// bilan bo'lishi kerak) — rasm o'tkazib yuborildi`
      );
      imageUrl = null;
    }

    const catKey = category.toLowerCase();
    if (!catByName.has(catKey) && !newCatNames.has(catKey)) {
      newCatNames.set(catKey, category);
    }

    parsed.push({
      excelRow,
      categoryKey: catKey,
      name,
      price,
      oldPrice: oldPrice !== null && oldPrice >= 0 ? oldPrice : null,
      weight,
      description,
      imageUrl,
    });
  }

  if (parsed.length === 0) {
    return fail(
      skipped.length > 0
        ? "Hech qanday yaroqli qator topilmadi. Ustun nomlarini shablon bilan solishtiring."
        : "Faylda mahsulot topilmadi",
      422
    );
  }

  // Tarif limiti — mavjud + qo'shiladigan mahsulotlar limitdan oshmasin
  const { effective, productLimit, expired } = getEffectivePlan(restaurant);
  let toCreate = parsed;
  let limitReached = false;
  if (productLimit !== null) {
    const current = await prisma.product.count({
      where: { restaurantId: restaurant.id },
    });
    const available = productLimit - current;
    if (available <= 0) {
      return fail(
        expired
          ? "Tarif muddati tugagan. Iltimos, tarifni yangilang."
          : `${PLANS[effective].name} tarifda ${productLimit} tagacha mahsulot qo'shish mumkin. Limit to'lgan — Pro tarifga o'ting.`,
        403
      );
    }
    if (parsed.length > available) {
      toCreate = parsed.slice(0, available);
      limitReached = true;
      warnings.push(
        `Tarif limiti (${productLimit}) sababli faqat ${available} ta mahsulot qo'shildi. Qolgan ${
          parsed.length - available
        } ta o'tkazib yuborildi.`
      );
    }
  }

  // Rasmlarni yuklab olib siqamiz: tashqi URL'larni o'z serverimizga
  // (/media) ko'chiramiz — kichikroq bo'ladi va tashqi saytga bog'liq qolmaydi.
  // Tranzaksiyadan TASHQARIDA qilinadi (tarmoq kutishi DB'ni band qilmasin).
  const withImages = toCreate.filter((p) => p.imageUrl);
  let imagesStored = 0;
  let imagesFailed = 0;
  await mapWithConcurrency(withImages, 6, async (p) => {
    const local = await storeRemoteImage(p.imageUrl!);
    if (local) {
      p.imageUrl = local;
      imagesStored++;
    } else {
      // Yuklab bo'lmadi — mahsulot rasmsiz qo'shiladi
      p.imageUrl = null;
      imagesFailed++;
    }
  });
  if (imagesFailed > 0) {
    warnings.push(
      `${imagesFailed} ta rasm yuklab olinmadi (havola noto'g'ri yoki ochilmadi) — mahsulotlar rasmsiz qo'shildi.`
    );
  }

  // Faqat qo'shiladigan mahsulotlar uchun kerakli yangi kategoriyalarni aniqlaymiz
  const usedNewCatKeys = new Set(
    toCreate.map((p) => p.categoryKey).filter((k) => !catByName.has(k))
  );

  // Tranzaksiya: yangi kategoriyalar + mahsulotlar
  let createdCount = 0;
  const createdCats: string[] = [];
  await prisma.$transaction(async (tx) => {
    let sortBase = await tx.category.count({ where: { restaurantId: restaurant.id } });
    for (const key of usedNewCatKeys) {
      const displayName = newCatNames.get(key)!;
      const created = await tx.category.create({
        data: {
          restaurantId: restaurant.id,
          name: displayName,
          sortOrder: sortBase++,
        },
      });
      catByName.set(key, created.id);
      createdCats.push(displayName);
    }

    let prodSort = await tx.product.count({ where: { restaurantId: restaurant.id } });
    for (const p of toCreate) {
      const categoryId = catByName.get(p.categoryKey);
      if (!categoryId) continue;
      await tx.product.create({
        data: {
          restaurantId: restaurant.id,
          categoryId,
          name: p.name,
          price: p.price,
          oldPrice: p.oldPrice,
          weight: p.weight,
          description: p.description,
          images: p.imageUrl ? JSON.stringify([p.imageUrl]) : null,
          sortOrder: prodSort++,
        },
      });
      createdCount++;
    }
  });

  return ok({
    created: createdCount,
    categoriesCreated: createdCats,
    imagesStored,
    skipped,
    warnings,
    limitReached,
  });
}
