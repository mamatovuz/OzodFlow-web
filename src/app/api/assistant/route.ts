import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { aiConfigured, aiGenerateJson, aiGenerateDishImage, AiUnavailableError } from "@/lib/ai";
import { getTopSellingProducts } from "@/lib/stats";
import {
  fetchStockFoodImage,
  stockConfigured,
  storeImageBuffer,
} from "@/lib/image-fetch";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

// AI yordamchi — restoran egasi tabiiy tilda so'raydi (sotuv, taom qo'shish, savol).
// Backend AI orqali niyatni aniqlaydi va amalni bajaradi.
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "assistant", { limit: 20, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  if (!(await aiConfigured())) {
    return fail("AI sozlanmagan. Administrator bilan bog'laning.", 503);
  }

  const body = await req.json().catch(() => null);
  const message = String(body?.message || "").trim();
  if (!message) return fail("Xabar bo'sh", 422);

  const ctx = await buildContext(restaurant.id);

  // ─── Niyatni aniqlash ───
  const prompt = `Sen OzodFlow restoran paneli yordamchisisan. O'zbekcha, qisqa va aniq javob ber.
Restoran: ${restaurant.name}.
Bugun: sotuv ${ctx.todayRevenue} so'm, ${ctx.todayOrders} buyurtma.
7 kun: ${ctx.weekRevenue} so'm, ${ctx.weekOrders} buyurtma.
30 kun: ${ctx.monthRevenue} so'm.
Faol mahsulot: ${ctx.productCount}, kategoriya: ${ctx.categoryCount}.
Eng ko'p sotilgan: ${ctx.topProducts.join(", ") || "—"}.

Foydalanuvchi: "${message}"

FAQAT shu JSON'ni qaytar (boshqa matnsiz):
{"intent":"sales|add_product|answer","reply":"o'zbekcha javob (sotuv so'ralsa yuqoridagi aniq raqamlar bilan)","product":{"name":"","category":"","price":0,"q":"english name","image":true}}
- add_product: taom qo'shish so'ralса, product'ni to'ldir (category — mos kategoriya nomi; q — inglizcha nom rasm uchun; image — rasm kerakmi).
- Aks holda product'ni bo'sh qoldir.`;

  let raw: string;
  try {
    raw = await aiGenerateJson(prompt, []);
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail(e.message, 503);
    return fail("AI javob bermadi. Qayta urinib ko'ring.", 502);
  }

  const parsed = parseIntent(raw);
  if (!parsed) return ok({ type: "text", reply: "Kechirasiz, tushunmadim. Boshqacharoq yozib ko'ring." });

  // ─── Taom qo'shish ───
  if (parsed.intent === "add_product" && parsed.product?.name) {
    // Tarif limiti tekshiruvi
    const { productLimit, effective, expired } = getEffectivePlan(restaurant);
    if (productLimit !== null) {
      const existing = await prisma.product.count({ where: { restaurantId: restaurant.id } });
      if (existing >= productLimit) {
        return ok({
          type: "text",
          reply: expired
            ? "Tarif muddati tugagan. Iltimos, to'lovni amalga oshiring."
            : `${PLANS[effective].name} tarifda ${productLimit} tagacha mahsulot mumkin. Pro tarifga o'ting.`,
        });
      }
    }

    const p = parsed.product;
    const name = String(p.name).trim().slice(0, 150);
    const price = Math.max(0, Math.round(Number(p.price) || 0));
    const wantImage = p.image !== false;
    const catName = String(p.category || "Boshqa").trim().slice(0, 100) || "Boshqa";

    // Kategoriyani topamiz yoki yaratamiz
    const category = await findOrCreateCategory(restaurant.id, catName);

    const prodOrder = await prisma.product.count({ where: { categoryId: category.id } });
    const product = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category.id,
        name,
        price,
        sortOrder: prodOrder,
      },
    });

    // Rasm — tez stock, topilmasa AI generatsiya (kvadrat, sifatli)
    let imageUrl: string | null = null;
    if (wantImage) {
      const query = String(p.q || name);
      if (stockConfigured()) imageUrl = await fetchStockFoodImage(query);
      if (!imageUrl) {
        const img = await aiGenerateDishImage(
          `A realistic, appetizing photo of "${query}" dish. Professional food photography, natural lighting, served on a plate, clean neutral background, high resolution, square 1:1 format.`
        );
        if (img) imageUrl = await storeImageBuffer(img.base64, { square: true });
      }
      if (imageUrl) {
        await prisma.product
          .update({ where: { id: product.id }, data: { images: JSON.stringify([imageUrl]) } })
          .catch(() => {});
      }
    }

    const priceText = price > 0 ? `${price.toLocaleString("uz-UZ").replace(/,/g, " ")} so'm` : "narxsiz";
    return ok({
      type: "product_added",
      product: { id: product.id, name, category: category.name, price, image: imageUrl },
      reply: `✓ "${name}" (${category.name}) — ${priceText} qo'shildi${
        wantImage ? (imageUrl ? " · rasm bilan" : " · rasm topilmadi") : ""
      }.`,
    });
  }

  // ─── Sotuv / umumiy javob ───
  return ok({ type: "text", reply: parsed.reply || "..." });
}

// ─── Restoran konteksti (aniq raqamlar) ───
async function buildContext(restaurantId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const monthAgo = new Date(today.getTime() - 29 * 86400000);
  const notCancelled = { not: "CANCELLED" as const };

  const [todayAgg, todayOrders, weekAgg, weekOrders, monthAgg, productCount, categoryCount, top] =
    await Promise.all([
      prisma.order.aggregate({ where: { restaurantId, createdAt: { gte: today }, status: notCancelled }, _sum: { total: true } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { restaurantId, createdAt: { gte: weekAgo }, status: notCancelled }, _sum: { total: true } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: weekAgo } } }),
      prisma.order.aggregate({ where: { restaurantId, createdAt: { gte: monthAgo }, status: notCancelled }, _sum: { total: true } }),
      prisma.product.count({ where: { restaurantId, isVisible: true } }),
      prisma.category.count({ where: { restaurantId } }),
      getTopSellingProducts(restaurantId, 5),
    ]);

  return {
    todayRevenue: todayAgg._sum.total || 0,
    todayOrders,
    weekRevenue: weekAgg._sum.total || 0,
    weekOrders,
    monthRevenue: monthAgg._sum.total || 0,
    productCount,
    categoryCount,
    topProducts: top.map((p) => `${p.name} (${p.qty})`),
  };
}

async function findOrCreateCategory(restaurantId: string, name: string) {
  const all = await prisma.category.findMany({ where: { restaurantId }, select: { id: true, name: true, sortOrder: true } });
  const found = all.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  if (found) return found;
  const maxOrder = all.reduce((m, c) => Math.max(m, c.sortOrder), -1);
  return prisma.category.create({
    data: { restaurantId, name, sortOrder: maxOrder + 1 },
    select: { id: true, name: true, sortOrder: true },
  });
}

type Intent = {
  intent: "sales" | "add_product" | "answer";
  reply: string;
  product?: { name?: string; category?: string; price?: number; q?: string; image?: boolean };
};

function parseIntent(raw: string): Intent | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s >= 0 && e > s) text = text.slice(s, e + 1);
  try {
    const obj = JSON.parse(text) as Intent;
    if (!obj.intent) return null;
    return obj;
  } catch {
    return null;
  }
}
