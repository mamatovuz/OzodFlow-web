import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { aiConfigured, aiGenerateJson, aiGenerateDishImage, AiUnavailableError } from "@/lib/ai";
import {
  readMediaAsBase64,
  storeImageBuffer,
  mapWithConcurrency,
  fetchStockFoodImage,
  stockConfigured,
} from "@/lib/image-fetch";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

type AiProduct = {
  name: string;
  nameRu?: string;
  price: number;
  description?: string;
  imagePrompt?: string;
};
type AiCategory = { name: string; nameRu?: string; products: AiProduct[] };

const ANALYZE_PROMPT = `Sen restoran menyusini raqamlashtiruvchi yordamchisan. Berilgan menyu rasm(lar)ini diqqat bilan o'qi va TO'LIQ menyuni chiqar.

Qoidalar:
- Har bir taom/ichimlikni tegishli kategoriyaga joyla (masalan: Salatlar, Ichimliklar, Ikkinchi taomlar).
- Narxni faqat butun son sifatida ber (so'm belgisi, probel, "so'm" so'zisiz). Masalan "25 000 so'm" -> 25000.
- Agar narx ko'rinmasa 0 qo'y.
- description: taomning qisqa (1 jumla) tavsifi (agar rasmda bor bo'lsa yoki taomdan aniq bo'lsa), aks holda bo'sh.
- imagePrompt: shu taomning chiroyli professional rasmini generatsiya qilish uchun INGLIZCHA qisqa tavsif. Masalan: "Uzbek plov with beef, carrots and rice, top view, professional food photo".
- nameRu: taom nomining ruscha varianti (bilsang).

FAQAT quyidagi JSON formatida javob ber (boshqa matn yozma):
{"categories":[{"name":"...","nameRu":"...","products":[{"name":"...","nameRu":"...","price":0,"description":"...","imagePrompt":"..."}]}]}`;

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "ai-import", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  if (!(await aiConfigured())) {
    return fail("AI hozircha sozlanmagan. Administrator bilan bog'laning.", 503);
  }

  const body = await req.json().catch(() => null);
  const step = body?.step;

  // ─── 1-qadam: menyu rasmlarini tahlil qilish (saqlamaydi, faqat preview) ───
  if (step === "analyze") {
    const urls: string[] = Array.isArray(body?.images) ? body.images.slice(0, 8) : [];
    if (urls.length === 0) return fail("Menyu rasmini yuklang", 422);

    // Menyu rasmlarini parallel o'qiymiz (ketma-ket emas — tezroq)
    const read = await mapWithConcurrency(urls, 4, (u) => readMediaAsBase64(String(u)));
    const images = read.filter((x): x is NonNullable<typeof x> => !!x);
    if (images.length === 0) return fail("Rasm o'qilmadi", 422);

    let raw: string;
    try {
      raw = await aiGenerateJson(ANALYZE_PROMPT, images);
    } catch (e) {
      if (e instanceof AiUnavailableError) return fail(e.message, 503);
      return fail("AI tahlil qila olmadi. Qayta urinib ko'ring.", 502);
    }

    const parsed = safeParseMenu(raw);
    if (!parsed || parsed.length === 0) {
      return fail("Menyu aniqlanmadi. Aniqroq rasm yuklab qayta urinib ko'ring.", 422);
    }
    const totalProducts = parsed.reduce((s, c) => s + c.products.length, 0);
    // stockAvailable: client rasm olish usulini (real foto) taklif qilishi uchun
    return ok({ categories: parsed, totalProducts, stockAvailable: stockConfigured() });
  }

  // ─── 2-qadam: tasdiqlangan menyuni yaratish ───
  if (step === "create") {
    const categories: AiCategory[] = Array.isArray(body?.categories) ? body.categories : [];
    const withImages = !!body?.withImages;
    if (categories.length === 0) return fail("Yaratish uchun ma'lumot yo'q", 422);

    const { effective, productLimit, expired } = getEffectivePlan(restaurant);
    const incoming = categories.reduce((s, c) => s + (c.products?.length || 0), 0);
    if (productLimit !== null) {
      const existing = await prisma.product.count({ where: { restaurantId: restaurant.id } });
      if (existing + incoming > productLimit) {
        return fail(
          expired
            ? "Tarif muddati tugagan. Iltimos, to'lovni amalga oshiring."
            : `${PLANS[effective].name} tarifda ${productLimit} tagacha mahsulot mumkin. Pro tarifga o'ting.`,
          403
        );
      }
    }

    let catOrder = await prisma.category.count({ where: { restaurantId: restaurant.id } });
    let createdCats = 0;
    let createdProds = 0;

    // Mahsulotlarni TEZDA yaratamiz. Rasmlar sekin — ularni alohida "images"
    // bosqichida (client polling bilan) yasaymiz, shunda so'rov timeout bo'lmaydi
    // va foydalanuvchi jarayonni (progress) ko'rib turadi.
    const pendingImages: { id: string; prompt: string }[] = [];

    for (const cat of categories) {
      const name = String(cat.name || "").trim();
      if (!name) continue;
      const category = await prisma.category.create({
        data: {
          restaurantId: restaurant.id,
          name: name.slice(0, 100),
          nameRu: cat.nameRu ? String(cat.nameRu).slice(0, 100) : null,
          sortOrder: catOrder++,
        },
      });
      createdCats++;

      let prodOrder = 0;
      for (const p of cat.products || []) {
        const pname = String(p.name || "").trim();
        if (!pname) continue;
        const price = Math.max(0, Math.round(Number(p.price) || 0));
        const product = await prisma.product.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: pname.slice(0, 150),
            nameRu: p.nameRu ? String(p.nameRu).slice(0, 150) : null,
            description: p.description ? String(p.description).slice(0, 500) : null,
            price,
            sortOrder: prodOrder++,
          },
        });
        createdProds++;
        const prompt = String(p.imagePrompt || pname).trim();
        if (withImages && prompt) pendingImages.push({ id: product.id, prompt });
      }
    }

    return ok({ createdCategories: createdCats, createdProducts: createdProds, pendingImages });
  }

  // ─── 3-qadam: mahsulotlarga AI rasm yasab biriktirish (bo'lak-bo'lak) ───
  // Client buni kichik guruhlarga bo'lib chaqiradi va progressni ko'rsatadi.
  if (step === "images") {
    const items: { id: string; prompt: string }[] = Array.isArray(body?.items)
      ? body.items.slice(0, 6)
      : [];
    if (items.length === 0) return ok({ done: 0 });

    // Faqat shu restoranga tegishli mahsulotlar (xavfsizlik)
    const ids = items.map((it) => String(it?.id || "")).filter(Boolean);
    const owned = await prisma.product.findMany({
      where: { id: { in: ids }, restaurantId: restaurant.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((p) => p.id));
    const valid = items.filter((it) => ownedIds.has(String(it.id)));

    // Rasm olish usuli: "mixed" (real foto → AI zaxira), "stock" (faqat real
    // foto), "ai" (faqat AI generatsiya). Default: mixed.
    const mode: "mixed" | "stock" | "ai" =
      body?.mode === "ai" || body?.mode === "stock" ? body.mode : "mixed";
    const useStock = stockConfigured();
    let done = 0;
    // Parallellik 3 (failover kalitlar bilan xavfsiz).
    await mapWithConcurrency(valid, 3, async (it) => {
      let url: string | null = null;

      // 1) Tez real foto (Pexels) — "ai" rejimidan tashqari
      if (mode !== "ai" && useStock) {
        url = await fetchStockFoodImage(it.prompt);
      }
      // 2) AI generatsiya — "stock" rejimidan tashqari (zaxira/asosiy)
      if (!url && mode !== "stock") {
        const img = await aiGenerateDishImage(
          `${it.prompt}. Professional food photography, appetizing, clean background, high detail, square format.`
        );
        if (img) url = await storeImageBuffer(img.base64);
      }
      if (!url) return;

      await prisma.product
        .update({ where: { id: it.id }, data: { images: JSON.stringify([url]) } })
        .catch(() => {});
      done++;
    });

    return ok({ done });
  }

  return fail("Noto'g'ri so'rov", 422);
}

// AI javobidan menyuni xavfsiz ajratib olish (JSON yoki ```json bloki bo'lsa ham)
function safeParseMenu(raw: string): AiCategory[] | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    const obj = JSON.parse(text) as { categories?: AiCategory[] };
    if (!Array.isArray(obj.categories)) return null;
    return obj.categories
      .filter((c) => c && c.name && Array.isArray(c.products))
      .map((c) => ({
        name: String(c.name),
        nameRu: c.nameRu ? String(c.nameRu) : undefined,
        products: c.products
          .filter((p) => p && p.name)
          .map((p) => ({
            name: String(p.name),
            nameRu: p.nameRu ? String(p.nameRu) : undefined,
            price: Math.max(0, Math.round(Number(p.price) || 0)),
            description: p.description ? String(p.description) : undefined,
            imagePrompt: p.imagePrompt ? String(p.imagePrompt) : undefined,
          })),
      }));
  } catch {
    return null;
  }
}
