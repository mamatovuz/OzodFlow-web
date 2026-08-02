// Eski yuklangan rasmlarni bir martalik siqadi — fayl nomi va formatini
// o'zgartirmaydi, shuning uchun DB'dagi /media/... havolalari joyida qoladi.
//
// Ishga tushirish (lokal):    node scripts/compress-uploads.mjs
// Railway'da (volume ustida): railway run node scripts/compress-uploads.mjs
//
// Idempotent: allaqachon kichik va tor rasmlarga tegmaydi, shuning uchun
// bir necha marta ishga tushirsa ham sifatni buzmaydi.
import sharp from "sharp";
import { readdir, readFile, writeFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_DIM = 1280; // eng katta tomon (px)
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 78;
const SKIP_SIZE = 250 * 1024; // shu hajmdan kichik + tor rasmlarga tegmaymiz

const RASTER = new Set(["jpeg", "png", "webp"]);

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function processFile(file) {
  const full = path.join(UPLOAD_DIR, file);
  const info = await stat(full);
  if (!info.isFile()) return null;

  const input = await readFile(full);

  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return { file, skipped: "rasm emas" };
  }

  const format = meta.format; // jpeg | png | webp | gif | ...
  if (format === "gif") return { file, skipped: "gif (animatsiya)" };
  if (!RASTER.has(format)) return { file, skipped: format || "noma'lum" };

  const maxSide = Math.max(meta.width || 0, meta.height || 0);
  // Allaqachon kichik va tor bo'lsa — tegmaymiz (idempotent)
  if (maxSide <= MAX_DIM && info.size <= SKIP_SIZE) {
    return { file, skipped: "allaqachon optimal" };
  }

  let pipeline = sharp(input).rotate().resize({
    width: MAX_DIM,
    height: MAX_DIM,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (format === "jpeg") pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  else if (format === "png") pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  else pipeline = pipeline.webp({ quality: WEBP_QUALITY });

  const output = await pipeline.toBuffer();

  // Siqilgani kattaroq chiqsa (kichik rasmlarda bo'lishi mumkin) — asl faylni qoldiramiz
  if (output.length >= info.size) {
    return { file, skipped: "siqish foyda bermadi", before: info.size, after: output.length };
  }

  // Xavfsiz yozish: avval temp, keyin rename
  const tmp = `${full}.tmp`;
  await writeFile(tmp, output);
  await rename(tmp, full).catch(async (e) => {
    await unlink(tmp).catch(() => {});
    throw e;
  });

  return { file, before: info.size, after: output.length };
}

async function main() {
  let files;
  try {
    files = await readdir(UPLOAD_DIR);
  } catch {
    console.error("Papka topilmadi:", UPLOAD_DIR);
    process.exit(1);
  }

  console.log(`Papka: ${UPLOAD_DIR}`);
  console.log(`Jami fayl: ${files.length}\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let done = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const r = await processFile(file);
      if (!r) continue;
      if (r.skipped) {
        skipped++;
        continue;
      }
      totalBefore += r.before;
      totalAfter += r.after;
      done++;
      const pct = ((1 - r.after / r.before) * 100).toFixed(0);
      console.log(`✓ ${file}: ${fmtKB(r.before)} → ${fmtKB(r.after)} (-${pct}%)`);
    } catch (e) {
      console.error(`✗ ${file}: ${e.message}`);
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`Siqildi: ${done} ta,  tegilmadi: ${skipped} ta`);
  if (done > 0) {
    const pct = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
    console.log(`Umumiy: ${fmtKB(totalBefore)} → ${fmtKB(totalAfter)} (-${pct}%)`);
  }
}

main();
