import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { aiConfigured, aiGenerateJson, aiGenerateDishImage, AiUnavailableError, type AiImage } from "@/lib/ai";
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

// Token-tejamkor prompt: kategoriya, taom nomi, narx va QISQA inglizcha qidiruv
// so'zi (q — aniq real foto topish uchun, 2-3 so'z). Tavsif so'ralmaydi. JSON
// kalitlari qisqa (c/n/i/p/q) — bu output tokenni sezilarli kamaytiradi.
const ANALYZE_PROMPT = `Menyu rasm(lar)idagi BARCHA taom va narxlarni o'qi — hech narsani tashlab ketma va takrorlama.
Narx faqat butun son (mas. "25 000 so'm" -> 25000; ko'rinmasa 0).
Taomlarni kategoriyaga guruhla. Har taomga q — shu taomning INGLIZCHA nomi (2-3 so'z, rasm qidirish uchun, mas. "uzbek plov", "lagman soup", "greek salad").
Javob FAQAT shu ixcham JSON bo'lsin (boshqa matn/izohsiz). Kalitlar aynan: c=kategoriyalar, n=nom, i=taomlar, p=narx, q=inglizcha nom:
{"c":[{"n":"Kategoriya","i":[{"n":"Taom","p":0,"q":"english name"}]}]}`;

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
    const urls: string[] = Array.isArray(body?.images) ? body.images.slice(0, 24) : [];
    if (urls.length === 0) return fail("Menyu rasmini yuklang", 422);

    // Menyu rasmlarini parallel o'qiymiz (ketma-ket emas — tezroq)
    const read = await mapWithConcurrency(urls, 4, (u) => readMediaAsBase64(String(u)));
    const images = read.filter((x): x is NonNullable<typeof x> => !!x);
    if (images.length === 0) return fail("Rasm o'qilmadi", 422);

    let parsed: AiCategory[];
    try {
      parsed = await analyzeMenu(images);
    } catch (e) {
      if (e instanceof AiUnavailableError) return fail(e.message, 503);
      return fail("AI tahlil qila olmadi. Qayta urinib ko'ring.", 502);
    }

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
          `A realistic, appetizing photo of "${it.prompt}" dish. Professional food photography, natural lighting, shallow depth of field, served on a plate, clean neutral background, ultra detailed, high resolution, square 1:1 format.`
        );
        if (img) url = await storeImageBuffer(img.base64, { square: true });
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

// ─── Menyu tahlili: ko'p rasmda bo'lib parallel + qayta urinish (ishonchli+tez) ───
async function analyzeMenu(images: AiImage[]): Promise<AiCategory[]> {
  const CHUNK = 4;
  if (images.length <= CHUNK) return analyzeOnce(images);
  // Ko'p rasm — bo'lib parallel o'qiymiz (tezroq, kesilmaydi), keyin birlashtiramiz
  const chunks: AiImage[][] = [];
  for (let i = 0; i < images.length; i += CHUNK) chunks.push(images.slice(i, i + CHUNK));
  const parts = await Promise.all(chunks.map((c) => analyzeOnce(c)));
  return mergeCategories(parts.flat());
}

async function analyzeOnce(images: AiImage[]): Promise<AiCategory[]> {
  let parsed = safeParseMenu(await aiGenerateJson(ANALYZE_PROMPT, images));
  // Bo'sh/buzuq bo'lsa bitta qayta urinish (modellar nodeterministik)
  if (!parsed || parsed.length === 0) {
    parsed = safeParseMenu(await aiGenerateJson(ANALYZE_PROMPT, images));
  }
  return parsed || [];
}

// Bir xil nomli kategoriyalarni birlashtiradi (chunk'lar orasidagi takrorni oldini oladi)
function mergeCategories(cats: AiCategory[]): AiCategory[] {
  const map = new Map<string, AiCategory>();
  for (const c of cats) {
    const key = c.name.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { name: c.name, nameRu: c.nameRu, products: [...c.products] });
      continue;
    }
    const seen = new Set(existing.products.map((p) => p.name.trim().toLowerCase()));
    for (const p of c.products) {
      const pk = p.name.trim().toLowerCase();
      if (!seen.has(pk)) {
        existing.products.push(p);
        seen.add(pk);
      }
    }
  }
  return Array.from(map.values());
}

// AI javobidan menyuni xavfsiz ajratib olish. Ixcham (c/n/i/p/q) va eski
// (categories/name/products/price) formatlarni ham qo'llaydi. Kesilgan JSONни
// tuzatib qutqaradi (uzun menyu chala qaytsa ham taomlar yo'qolmaydi).
function safeParseMenu(raw: string): AiCategory[] | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  type RawCat = { c?: unknown; categories?: unknown };
  let obj = tryParse<RawCat>(text);
  if (!obj) {
    const repaired = tryRepairJson(text);
    if (repaired) obj = tryParse<RawCat>(repaired);
  }
  if (!obj) return null;

  const rawCats = Array.isArray(obj.c)
    ? obj.c
    : Array.isArray(obj.categories)
    ? obj.categories
    : null;
  if (!rawCats) return null;

  const out: AiCategory[] = [];
  for (const rc of rawCats as Record<string, unknown>[]) {
    if (!rc) continue;
    const name = String(rc.n ?? rc.name ?? "").trim();
    const items = Array.isArray(rc.i) ? rc.i : Array.isArray(rc.products) ? rc.products : [];
    const products = (items as Record<string, unknown>[])
      .filter((p) => p && (p.n ?? p.name))
      .map((p) => ({
        name: String(p.n ?? p.name).trim().slice(0, 150),
        price: Math.max(0, Math.round(Number(p.p ?? p.price) || 0)),
        // q = qidiruv uchun inglizcha nom (rasm topishда ishlatiladi)
        imagePrompt: (p.q ?? p.imagePrompt) ? String(p.q ?? p.imagePrompt).slice(0, 80) : undefined,
      }))
      .filter((p) => p.name);
    if (name && products.length > 0) out.push({ name: name.slice(0, 100), products });
  }
  return out;
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Kesilgan JSONни tuzatadi: ochiq qolgan qavslarni (string ichini hisobga olib)
// yopadi va oxirgi chala elementni tashlaydi. Muvaffaqiyatда tuzatilgan matn.
function tryRepairJson(text: string): string | null {
  let inStr = false;
  let esc = false;
  let lastClose = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "}" || ch === "]") lastClose = i;
  }
  if (lastClose < 0) return null;
  let s = text.slice(0, lastClose + 1);

  // Qolgan ochiq qavslarni hisoblab yopamiz
  inStr = false;
  esc = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  s = s.replace(/,\s*$/, "");
  while (stack.length) s += stack.pop();
  return s;
}
