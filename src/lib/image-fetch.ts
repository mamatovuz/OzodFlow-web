import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomCode } from "./utils";
import { UPLOAD_DIR, contentTypeFor } from "./uploads";

const MAX_DIM = 1600; // eng katta tomon (px)
const WEBP_QUALITY = 88;
const DISH_DIM = 1024; // taom rasmi uchun kvadrat o'lcham
const DISH_QUALITY = 90; // taom rasmi uchun yuqoriroq sifat
const MAX_BYTES = 15 * 1024 * 1024; // 15MB dan katta rasmni yuklamaymiz
const FETCH_TIMEOUT_MS = 12000;

type StoreOpts = { square?: boolean };

// Sharp orqali rasmni webp'ga siqadi. square bo'lsa — 1024x1024 kvadrat
// (fit:cover + attention: taomni markazda saqlaydi), yuqori sifat bilan.
async function toWebp(input: Buffer, opts?: StoreOpts): Promise<Buffer> {
  const pipe = sharp(input).rotate();
  if (opts?.square) {
    return pipe
      .resize(DISH_DIM, DISH_DIM, { fit: "cover", position: "attention" })
      .webp({ quality: DISH_QUALITY, effort: 5, smartSubsample: true })
      .toBuffer();
  }
  return pipe
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
    .toBuffer();
}

/**
 * Tashqi URL'dan rasmni yuklab olib, siqib, /media/... ga saqlaydi.
 * Muvaffaqiyatда yangi lokal yo'lni ("/media/xxx.webp") qaytaradi,
 * xatoда null (chaqiruvchi tomon ogohlantirish beradi).
 */
export async function storeRemoteImage(url: string, opts?: StoreOpts): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "OzodFlow/1.0 (+menu image import)" },
    });
    if (!resp.ok) return null;

    const type = resp.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;

    const len = Number(resp.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) return null;

    const input = Buffer.from(await resp.arrayBuffer());
    if (input.byteLength > MAX_BYTES) return null;

    // GIF animatsiyasini buzmaslik uchun uni siqmasdan saqlaymiz (kvadrat emas bo'lsa)
    let bytes: Buffer;
    let ext: string;
    if (type.includes("gif") && !opts?.square) {
      bytes = input;
      ext = "gif";
    } else {
      bytes = await toWebp(input, opts);
      ext = "webp";
    }

    const filename = `${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return `/media/${filename}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lokal /media/<nom> rasmini o'qib, base64 + mime qaytaradi (AI vision uchun).
 * Yo'l xavfsizligi: faqat UPLOAD_DIR ichidagi fayllar.
 */
export async function readMediaAsBase64(
  mediaUrl: string
): Promise<{ base64: string; mime: string } | null> {
  try {
    const name = mediaUrl.replace(/^\/media\//, "").split("/").pop() || "";
    if (!name || name.includes("..")) return null;
    const full = path.join(UPLOAD_DIR, name);
    const buf = await readFile(full);
    return { base64: buf.toString("base64"), mime: contentTypeFor(name) };
  } catch {
    return null;
  }
}

/**
 * Pexels sozlanganmi (tez, tayyor stock food rasmlar uchun).
 */
export function stockConfigured(): boolean {
  return !!process.env.PEXELS_API_KEY;
}

/**
 * Taom nomi/tavsifi bo'yicha Pexels'dan HAQIQIY food rasm topadi va saqlaydi.
 * AI generatsiyaга nisbatan ~10x tez (~1-2s). Topilmasa yoki kalit yo'q bo'lsa null.
 */
export async function fetchStockFoodImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  // Qidiruv so'zini qisqartiramiz (uzun prompt Pexels'da mos kelmaydi)
  const q = query.split(/[,.(]/)[0].trim().slice(0, 60) || query;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q + " food dish")}&per_page=5&orientation=square`,
      { headers: { Authorization: key }, signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: { src?: { large2x?: string; large?: string; medium?: string } }[];
    };
    const photo = data.photos?.[0];
    const url = photo?.src?.large2x || photo?.src?.large || photo?.src?.medium;
    if (!url) return null;
    // Taom kartasi uchun kvadrat, yuqori sifat
    return await storeRemoteImage(url, { square: true });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI generatsiya qilgan rasm buferini webp'ga o'girib /media ga saqlaydi.
 * Muvaffaqiyatда yangi /media/... yo'lini qaytaradi.
 */
export async function storeImageBuffer(base64: string, opts?: StoreOpts): Promise<string | null> {
  try {
    const input = Buffer.from(base64, "base64");
    const bytes = await toWebp(input, opts);
    const filename = `${Date.now()}-${randomCode(6).toLowerCase()}.webp`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return `/media/${filename}`;
  } catch {
    return null;
  }
}

/**
 * Vazifalarni cheklangan parallellik bilan bajaradi (import paytida
 * 159 ta rasmni birdaniga emas, bo'lib-bo'lib yuklash uchun).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
