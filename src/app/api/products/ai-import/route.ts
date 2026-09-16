import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { aiConfigured, aiGenerateJson, aiGenerateDishImage, AiUnavailableError } from "@/lib/ai";
import {
  readMediaAsBase64,
  storeImageBuffer,
  mapWithConcurrency,
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

    const images = [];
    for (const u of urls) {
      const img = await readMediaAsBase64(String(u));
      if (img) images.push(img);
    }
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
    return ok({ categories: parsed, totalProducts });
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

    // Rasmlar generatsiyasi sekin — avval mahsulotlarni yaratamiz, keyin rasm biriktiramiz
    const madeProducts: { id: string; imagePrompt: string; name: string }[] = [];

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
        if (withImages && p.imagePrompt) {
          madeProducts.push({ id: product.id, imagePrompt: String(p.imagePrompt), name: pname });
        }
      }
    }

    // Rasmlarni AI orqali generatsiya qilib biriktiramiz (cheklangan parallellik)
    let imagesMade = 0;
    if (withImages && madeProducts.length > 0) {
      await mapWithConcurrency(madeProducts, 2, async (mp) => {
        const img = await aiGenerateDishImage(
          `${mp.imagePrompt}. Professional food photography, appetizing, clean background, high detail, square format.`
        );
        if (!img) return;
        const url = await storeImageBuffer(img.base64);
        if (!url) return;
        await prisma.product
          .update({ where: { id: mp.id }, data: { images: JSON.stringify([url]) } })
          .catch(() => {});
        imagesMade++;
      });
    }

    return ok({ createdCategories: createdCats, createdProducts: createdProds, imagesMade });
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
