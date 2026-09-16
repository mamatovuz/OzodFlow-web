import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { aiConfigured, aiGenerateJson, aiGenerateDishImage, AiUnavailableError } from "@/lib/ai";
import { getTopSellingProducts } from "@/lib/stats";
import { fetchStockFoodImage, stockConfigured, storeImageBuffer, mapWithConcurrency } from "@/lib/image-fetch";
import { getEffectivePlan, PLANS } from "@/lib/plans";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─────────────────────────────────────────────
// AI yordamchi — tabiiy tilda: sotuv/statistika, taom qo'shish/tahrirlash,
// stop-list, ko'rinish, o'chirish (tasdiq bilan).
//
// TOKEN-TEJASH: keng tarqalgan savollar (sotuv, top, mahsulot soni) AI'siz,
// to'g'ridan-to'g'ri bazadan javob beriladi. AI faqat murakkab/amal uchun.
//
// MAXFIYLIK: har bir amal FAQAT foydalanuvchi restoraniga tegishli (scoped).
// O'chirish — faqat tasdiqdan keyin. Mahsulot nomi bazadan mos qidiriladi
// (AI'ga mahsulotlar ro'yxati yuborilmaydi).
// ─────────────────────────────────────────────

const MAX_MSG = 500;

const money = (n: number) => Math.round(n).toLocaleString("uz-UZ").replace(/,/g, " ");

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "assistant", { limit: 20, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);

  // ─── Tasdiqlangan xavfli amal (o'chirish) ───
  if (body?.confirm?.action === "del" && body.confirm.productId) {
    // Maxfiylik: faqat shu restoranга tegishli mahsulot o'chadi
    const del = await prisma.product.deleteMany({
      where: { id: String(body.confirm.productId), restaurantId: restaurant.id },
    });
    if (del.count === 0) return ok({ type: "text", reply: "Mahsulot topilmadi." });
    return ok({ type: "text", reply: `✓ "${String(body.confirm.name || "").slice(0, 80)}" o'chirildi.` });
  }

  const message = String(body?.message || "").trim().slice(0, MAX_MSG);
  if (!message) return fail("Xabar bo'sh", 422);

  // ─── 0) TOKENSIZ: rasmsiz taom/kategoriyalarga rasm qo'yish ───
  const imgFill = detectImageFill(message);
  if (imgFill === "products") {
    const items = await productsNeedingImages(restaurant.id);
    if (items.length === 0) return ok({ type: "text", reply: "Barcha taomlarда rasm bor 👍" });
    return ok({
      type: "fill_images",
      items,
      reply: `${items.length} ta rasmsiz taom topildi. Rasm qo'shaymi?`,
    });
  }
  if (imgFill === "categories") {
    const n = await fillCategoryImages(restaurant.id);
    return ok({
      type: "text",
      reply: n > 0 ? `✓ ${n} ta kategoriyaga rasm qo'yildi.` : "Rasmsiz kategoriya topilmadi yoki rasm topilmadi.",
    });
  }

  // ─── 1) TOKENSIZ tez javob (keng tarqalgan statistika savollari) ───
  const fast = await fastAnswer(message, restaurant.id);
  if (fast) return ok({ type: "text", reply: fast });

  // ─── 2) AI orqali amal/murakkab so'rov ───
  if (!(await aiConfigured())) {
    return ok({ type: "text", reply: "Bu so'rov uchun AI kaliti kerak. Statistika savollarini bemalol so'rashingiz mumkin." });
  }

  const prompt = `Restoran paneli yordamchisi. Buyruqni tushun va FAQAT shu JSON'ni qaytar (qisqa o'zbekcha):
{"a":"none|add|price|stop|resume|hide|show|rename|del|cat|badge","r":"javob","name":"","cat":"","price":0,"q":"english name","newName":"","badge":"hit|new|veg|rec","on":true}
a=amal: add=taom qo'sh(name,cat,price,q — q inglizcha nom); price=narx(name,price); stop=stop-listga(name); resume=stopdan qaytar(name); hide=menyudan yashir(name); show=ko'rsat(name); rename=nom(name,newName); del=o'chir(name); cat=kategoriya(name); badge=belgi(name,badge: hit=xit/new=yangi/veg=vegetarian/rec=tavsiya, on=true qo'yish/false olib tashlash); none=oddiy javob(r).
Buyruq: "${message}"`;

  let raw: string;
  try {
    raw = await aiGenerateJson(prompt, []);
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail(e.message, 503);
    return fail("AI javob bermadi. Qayta urinib ko'ring.", 502);
  }

  const cmd = parseCmd(raw);
  if (!cmd) return ok({ type: "text", reply: "Tushunmadim. Boshqacharoq yozib ko'ring." });

  return executeCommand(cmd, restaurant);
}

// ─────────────────────────────────────────────
// TOKENSIZ: rasm qo'yish niyatini aniqlash
// ─────────────────────────────────────────────
function detectImageFill(message: string): "products" | "categories" | null {
  const m = message.toLowerCase();
  const wantsImg = m.includes("rasm") && /(qo'y|qoy|qosh|qo'sh|joyla|yasa|chiqar|top)/.test(m);
  if (!wantsImg) return null;
  if (m.includes("kategoriya") || m.includes("bo'lim")) return "categories";
  if (m.includes("taom") || m.includes("menyu") || m.includes("mahsulot") || m.includes("rasmsiz") || m.includes("yo'q"))
    return "products";
  return null; // noaniq — AI'ga qoldiramiz
}

// images maydoni bo'sh (rasm yo'q)mi?
function noImage(images: string | null): boolean {
  if (!images) return true;
  const s = images.trim();
  if (!s || s === "[]") return true;
  try {
    const arr = JSON.parse(s);
    return !Array.isArray(arr) || arr.length === 0;
  } catch {
    return false;
  }
}

// Rasmsiz taomlar (client rasm qo'shishда ai-import "images" step'ini ishlatadi)
async function productsNeedingImages(restaurantId: string) {
  const rows = await prisma.product.findMany({
    where: { restaurantId },
    select: { id: true, name: true, images: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows
    .filter((r) => noImage(r.images))
    .map((r) => ({ id: r.id, prompt: r.name }))
    .slice(0, 200);
}

// Rasmsiz kategoriyalarга rasm (kam bo'lgani uchun server'da darhol)
async function fillCategoryImages(restaurantId: string): Promise<number> {
  const cats = await prisma.category.findMany({
    where: { restaurantId },
    select: { id: true, name: true, image: true },
  });
  const need = cats.filter((c) => !c.image).slice(0, 40);
  let done = 0;
  await mapWithConcurrency(need, 3, async (c) => {
    let url: string | null = null;
    if (stockConfigured()) url = await fetchStockFoodImage(c.name);
    if (!url) {
      const img = await aiGenerateDishImage(
        `A realistic, appetizing photo representing "${c.name}" food category. Professional food photography, natural lighting, clean background, high resolution, square 1:1 format.`
      );
      if (img) url = await storeImageBuffer(img.base64, { square: true });
    }
    if (url) {
      await prisma.category.update({ where: { id: c.id }, data: { image: url } }).catch(() => {});
      done++;
    }
  });
  return done;
}

// ─────────────────────────────────────────────
// TOKENSIZ statistika (kalit so'zlar bo'yicha)
// ─────────────────────────────────────────────
async function fastAnswer(message: string, restaurantId: string): Promise<string | null> {
  const m = message.toLowerCase();
  const has = (...w: string[]) => w.some((x) => m.includes(x));

  const isSales = has("sotuv", "savdo", "daromad", "tushum", "sotildi", "necha pul", "qancha pul");
  const isOrders = has("buyurtma", "zakaz", "order");
  const isTop = has("eng ko'p", "top", "mashhur", "ko'p sotil");
  const isCount = has("nechta mahsulot", "mahsulot soni", "taom soni", "menyuda nechta");

  if (!isSales && !isOrders && !isTop && !isCount) return null;

  const today = startOfToday();
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const monthAgo = new Date(today.getTime() - 29 * 86400000);
  const nc = { not: "CANCELLED" as const };

  // Davrni aniqlaymiz
  const period = has("oy", "oylik") ? "month" : has("hafta", "haftalik", "7 kun") ? "week" : "today";
  const gte = period === "month" ? monthAgo : period === "week" ? weekAgo : today;
  const label = period === "month" ? "30 kun" : period === "week" ? "7 kun" : "Bugun";

  if (isTop) {
    const top = await getTopSellingProducts(restaurantId, 5);
    if (top.length === 0) return "Hali sotuv bo'lmagan — eng ko'p sotilgan taomlar yo'q.";
    return "Eng ko'p sotilgan taomlar (30 kun):\n" + top.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} ta`).join("\n");
  }

  if (isCount) {
    const [pc, cc] = await Promise.all([
      prisma.product.count({ where: { restaurantId, isVisible: true } }),
      prisma.category.count({ where: { restaurantId } }),
    ]);
    return `Menyuда ${pc} ta faol mahsulot, ${cc} ta kategoriya bor.`;
  }

  const [agg, count] = await Promise.all([
    prisma.order.aggregate({ where: { restaurantId, createdAt: { gte }, status: nc }, _sum: { total: true } }),
    prisma.order.count({ where: { restaurantId, createdAt: { gte } } }),
  ]);
  const rev = agg._sum.total || 0;

  if (isOrders && !isSales) return `${label}: ${count} ta buyurtma.`;
  return `${label}: ${money(rev)} so'm sotuv · ${count} ta buyurtma.`;
}

// ─────────────────────────────────────────────
// Amallar
// ─────────────────────────────────────────────
type Cmd = {
  a: string;
  r?: string;
  name?: string;
  cat?: string;
  price?: number;
  q?: string;
  newName?: string;
  badge?: string;
  on?: boolean;
};

async function executeCommand(cmd: Cmd, restaurant: { id: string; plan: string; planUntil: Date | null }) {
  const a = cmd.a;

  if (a === "none") return ok({ type: "text", reply: cmd.r || "..." });

  if (a === "cat") {
    const name = String(cmd.name || "").trim().slice(0, 100);
    if (!name) return ok({ type: "text", reply: "Kategoriya nomini yozing." });
    const exists = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: { equals: name } },
    });
    if (exists) return ok({ type: "text", reply: `"${name}" kategoriyasi allaqachon bor.` });
    const maxOrder = await prisma.category.aggregate({ where: { restaurantId: restaurant.id }, _max: { sortOrder: true } });
    await prisma.category.create({ data: { restaurantId: restaurant.id, name, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 } });
    return ok({ type: "text", reply: `✓ "${name}" kategoriyasi qo'shildi.` });
  }

  if (a === "add") return addProduct(cmd, restaurant);

  // Quyidagilar mavjud mahsulotni nishonlaydi — bazadan mos qidiramiz (scoped)
  const targetName = String(cmd.name || "").trim();
  if (!targetName) return ok({ type: "text", reply: "Qaysi taom? Nomini yozing." });

  const matches = await findProducts(restaurant.id, targetName);
  if (matches.length === 0) return ok({ type: "text", reply: `"${targetName}" nomli taom topilmadi.` });
  if (matches.length > 1) {
    return ok({
      type: "text",
      reply: `Bir nechta mos keldi: ${matches.slice(0, 5).map((p) => p.name).join(", ")}. Aniqroq nom yozing.`,
    });
  }
  const p = matches[0];

  if (a === "price") {
    const price = Math.max(0, Math.round(Number(cmd.price) || 0));
    await prisma.product.update({ where: { id: p.id }, data: { price } });
    return ok({ type: "text", reply: `✓ "${p.name}" narxi ${money(price)} so'm bo'ldi.` });
  }
  if (a === "stop") {
    await prisma.product.update({ where: { id: p.id }, data: { isAvailable: false } });
    return ok({ type: "text", reply: `✓ "${p.name}" stop-listga qo'shildi (vaqtincha mavjud emas).` });
  }
  if (a === "resume") {
    await prisma.product.update({ where: { id: p.id }, data: { isAvailable: true } });
    return ok({ type: "text", reply: `✓ "${p.name}" yana mavjud.` });
  }
  if (a === "hide") {
    await prisma.product.update({ where: { id: p.id }, data: { isVisible: false } });
    return ok({ type: "text", reply: `✓ "${p.name}" menyudan yashirildi.` });
  }
  if (a === "show") {
    await prisma.product.update({ where: { id: p.id }, data: { isVisible: true } });
    return ok({ type: "text", reply: `✓ "${p.name}" menyuда ko'rinadi.` });
  }
  if (a === "rename") {
    const newName = String(cmd.newName || "").trim().slice(0, 150);
    if (!newName) return ok({ type: "text", reply: "Yangi nomni yozing." });
    await prisma.product.update({ where: { id: p.id }, data: { name: newName } });
    return ok({ type: "text", reply: `✓ "${p.name}" → "${newName}" deb o'zgartirildi.` });
  }
  if (a === "badge") {
    const map: Record<string, { field: "isBestseller" | "isNew" | "isVegetarian" | "isRecommended"; label: string }> = {
      hit: { field: "isBestseller", label: "Xit" },
      new: { field: "isNew", label: "Yangi" },
      veg: { field: "isVegetarian", label: "Vegetarian" },
      rec: { field: "isRecommended", label: "Tavsiya" },
    };
    const b = map[String(cmd.badge || "")];
    if (!b) return ok({ type: "text", reply: "Qaysi belgi? (xit, yangi, vegetarian, tavsiya)" });
    const on = cmd.on !== false;
    await prisma.product.update({ where: { id: p.id }, data: { [b.field]: on } });
    return ok({
      type: "text",
      reply: `✓ "${p.name}" ${on ? `${b.label} belgisiga qo'shildi` : `${b.label} dan olib tashlandi`}.`,
    });
  }
  if (a === "del") {
    // Xavfli — tasdiq so'raymiz (darhol o'chirmaymiz)
    return ok({
      type: "confirm",
      action: "del",
      productId: p.id,
      name: p.name,
      reply: `"${p.name}" ni butunlay o'chirishни tasdiqlaysizmi?`,
    });
  }

  return ok({ type: "text", reply: cmd.r || "Bajarildi." });
}

async function addProduct(cmd: Cmd, restaurant: { id: string; plan: string; planUntil: Date | null }) {
  const name = String(cmd.name || "").trim().slice(0, 150);
  if (!name) return ok({ type: "text", reply: "Taom nomini yozing." });

  const { productLimit, effective, expired } = getEffectivePlan(restaurant);
  if (productLimit !== null) {
    const existing = await prisma.product.count({ where: { restaurantId: restaurant.id } });
    if (existing >= productLimit) {
      return ok({
        type: "text",
        reply: expired
          ? "Tarif muddati tugagan. Iltimos, to'lovni amalga oshiring."
          : `${PLANS[effective].name} tarifda ${productLimit} tagacha mumkin. Yuqori tarifga o'ting.`,
      });
    }
  }

  const price = Math.max(0, Math.round(Number(cmd.price) || 0));
  const catName = String(cmd.cat || "Boshqa").trim().slice(0, 100) || "Boshqa";
  const category = await findOrCreateCategory(restaurant.id, catName);
  const prodOrder = await prisma.product.count({ where: { categoryId: category.id } });
  const product = await prisma.product.create({
    data: { restaurantId: restaurant.id, categoryId: category.id, name, price, sortOrder: prodOrder },
  });

  // Rasm — tez stock, topilmasa AI (kvadrat, sifatli)
  const query = String(cmd.q || name);
  let imageUrl: string | null = null;
  if (stockConfigured()) imageUrl = await fetchStockFoodImage(query);
  if (!imageUrl) {
    const img = await aiGenerateDishImage(
      `A realistic, appetizing photo of "${query}" dish. Professional food photography, natural lighting, served on a plate, clean neutral background, high resolution, square 1:1 format.`
    );
    if (img) imageUrl = await storeImageBuffer(img.base64, { square: true });
  }
  if (imageUrl) {
    await prisma.product.update({ where: { id: product.id }, data: { images: JSON.stringify([imageUrl]) } }).catch(() => {});
  }

  const priceText = price > 0 ? `${money(price)} so'm` : "narxsiz";
  return ok({
    type: "product_added",
    product: { id: product.id, name, category: category.name, price, image: imageUrl },
    reply: `✓ "${name}" (${category.name}) — ${priceText} qo'shildi${imageUrl ? " · rasm bilan" : " · rasm topilmadi"}.`,
  });
}

// ─── Yordamchilar (hammasi restoranга scoped — maxfiylik) ───
async function findProducts(restaurantId: string, name: string) {
  const q = name.trim().toLowerCase();
  const all = await prisma.product.findMany({
    where: { restaurantId },
    select: { id: true, name: true },
  });
  const exact = all.filter((p) => p.name.trim().toLowerCase() === q);
  if (exact.length) return exact;
  return all.filter((p) => {
    const pn = p.name.trim().toLowerCase();
    return pn.includes(q) || q.includes(pn);
  });
}

async function findOrCreateCategory(restaurantId: string, name: string) {
  const all = await prisma.category.findMany({ where: { restaurantId }, select: { id: true, name: true, sortOrder: true } });
  const found = all.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  if (found) return found;
  const maxOrder = all.reduce((mx, c) => Math.max(mx, c.sortOrder), -1);
  return prisma.category.create({
    data: { restaurantId, name, sortOrder: maxOrder + 1 },
    select: { id: true, name: true, sortOrder: true },
  });
}

function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function parseCmd(raw: string): Cmd | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s >= 0 && e > s) text = text.slice(s, e + 1);
  try {
    const obj = JSON.parse(text) as Cmd;
    if (!obj.a) return null;
    return obj;
  } catch {
    return null;
  }
}
