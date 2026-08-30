import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "./uploads";

// ─────────────────────────────────────────────
// LQIP (Low-Quality Image Placeholder) — juda kichik xira "peshko'rinish".
//
// Har menyu rasmi uchun ~20px li xira base64 (data URI) tayyorlanadi va SSR
// HTML ichiga joylanadi. Sahifa ochilishi bilan XIRA rasm DARHOL ko'rinadi
// (alohida so'rov yo'q), aniq rasm ustidan yumshoq paydo bo'ladi. Shu tufayli
// karta hech qачон bo'sh (qora) turmaydi — "rasm sahifa bilan birga" chiqadi.
//
// Ikki qatlamli kesh: xotira (Map) + disk. Bir marta ishlanadi, keyin tez.
// ─────────────────────────────────────────────

const LQIP_DIR = path.join(UPLOAD_DIR, "_lqip");
const memCache = new Map<string, string | null>();

function localPath(src: string): string | null {
  if (src.startsWith("/media/") || src.startsWith("/uploads/")) {
    return path.join(UPLOAD_DIR, path.basename(src));
  }
  return null;
}

/** Bitta rasm uchun LQIP data URI (yoki null — tashqi/bo'lmagan rasm). */
export async function lqipFor(src: string | undefined | null): Promise<string | null> {
  if (!src) return null;
  if (memCache.has(src)) return memCache.get(src)!;

  const local = localPath(src);
  if (!local) {
    memCache.set(src, null);
    return null;
  }

  const key = crypto.createHash("sha1").update(src).digest("hex");
  const cacheFile = path.join(LQIP_DIR, `${key}.txt`);

  // Disk keshdan
  try {
    const cached = await readFile(cacheFile, "utf8");
    if (cached) {
      memCache.set(src, cached);
      return cached;
    }
  } catch {
    /* yo'q — ishlaymiz */
  }

  try {
    const buf = await readFile(local);
    const tiny = await sharp(buf)
      .resize(24, 30, { fit: "cover", position: "attention" }) // 4:5 kichik
      .webp({ quality: 45 })
      .toBuffer();
    const uri = `data:image/webp;base64,${tiny.toString("base64")}`;
    memCache.set(src, uri);
    mkdir(LQIP_DIR, { recursive: true })
      .then(() => writeFile(cacheFile, uri))
      .catch(() => {});
    return uri;
  } catch {
    memCache.set(src, null);
    return null;
  }
}

/** JSON images massividagi BIRINCHI rasm uchun LQIP. */
export async function lqipForImages(imagesJson: string | null | undefined): Promise<string | null> {
  if (!imagesJson) return null;
  try {
    const arr = JSON.parse(imagesJson);
    if (Array.isArray(arr) && typeof arr[0] === "string") return lqipFor(arr[0]);
  } catch {
    /* ignore */
  }
  return null;
}
