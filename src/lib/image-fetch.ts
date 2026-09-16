import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomCode } from "./utils";
import { UPLOAD_DIR, contentTypeFor } from "./uploads";

const MAX_DIM = 1600; // eng katta tomon (px)
const WEBP_QUALITY = 88;
const MAX_BYTES = 15 * 1024 * 1024; // 15MB dan katta rasmni yuklamaymiz
const FETCH_TIMEOUT_MS = 12000;

/**
 * Tashqi URL'dan rasmni yuklab olib, siqib, /media/... ga saqlaydi.
 * Muvaffaqiyatда yangi lokal yo'lni ("/media/xxx.webp") qaytaradi,
 * xatoда null (chaqiruvchi tomon ogohlantirish beradi).
 */
export async function storeRemoteImage(url: string): Promise<string | null> {
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

    // GIF animatsiyasini buzmaslik uchun uni siqmasdan saqlaymiz
    let bytes: Buffer;
    let ext: string;
    if (type.includes("gif")) {
      bytes = input;
      ext = "gif";
    } else {
      bytes = await sharp(input)
        .rotate()
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
        .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
        .toBuffer();
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
 * AI generatsiya qilgan rasm buferini webp'ga o'girib /media ga saqlaydi.
 * Muvaffaqiyatда yangi /media/... yo'lini qaytaradi.
 */
export async function storeImageBuffer(base64: string): Promise<string | null> {
  try {
    const input = Buffer.from(base64, "base64");
    const bytes = await sharp(input)
      .rotate()
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .webp({ quality: 90, effort: 5, smartSubsample: true })
      .toBuffer();
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
