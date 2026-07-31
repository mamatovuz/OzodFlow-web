// OzodFlow ikonka generatori — public/ozodqr.jpg logosidan barcha favicon/logo fayllarini yaratadi.
// Ishga tushirish: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public");
const SRC = join(PUB, "ozodqr.jpg");

// 1. Logoni oq chekkalaridan kesib olamiz (trim) va bazaviy kvadrat markani tayyorlaymiz
async function makeMark(size, { padding = 0.08, bg = "#ffffff" } = {}) {
  const trimmed = await sharp(SRC).trim({ threshold: 12 }).toBuffer();
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: bg })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function writeMark(name, size, opts) {
  const buf = await makeMark(size, opts);
  writeFileSync(join(PUB, name), buf);
  console.log("✓", name, `${size}px`);
}

// PNG bufferni ICO ichiga o'raymiz (modern brauzerlar PNG-li ICO ni qo'llab-quvvatlaydi)
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(pngBuffer.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset
  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  // App logo marki (oq fon, dumaloq konteyner ichida ishlatiladi)
  await writeMark("ozodflow-logo.png", 256, { padding: 0.06 });

  // Faviconlar
  await writeMark("favicon-16.png", 16, { padding: 0.04 });
  await writeMark("favicon-32.png", 32, { padding: 0.04 });
  await writeMark("favicon-64.png", 64, { padding: 0.06 });
  await writeMark("favicon-96x96.png", 96, { padding: 0.06 });
  await writeMark("favicon-512.png", 512, { padding: 0.08 });

  // Apple touch + PWA
  await writeMark("apple-touch-icon.png", 180, { padding: 0.1 });
  await writeMark("web-app-manifest-192x192.png", 192, { padding: 0.1 });
  await writeMark("web-app-manifest-512x512.png", 512, { padding: 0.1 });

  // favicon.ico (64px PNG asosida)
  const icoPng = await makeMark(64, { padding: 0.06 });
  writeFileSync(join(PUB, "favicon.ico"), pngToIco(icoPng, 64));
  console.log("✓ favicon.ico");

  // favicon.svg — 512 PNG ni base64 sifatida o'raydi (masshtablanadi)
  const svgPng = await makeMark(512, { padding: 0.08 });
  const b64 = svgPng.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#ffffff"/><image href="data:image/png;base64,${b64}" width="512" height="512"/></svg>`;
  writeFileSync(join(PUB, "favicon.svg"), svg);
  console.log("✓ favicon.svg");

  // OG rasm (1200x630, markazda logo)
  const ogMark = await sharp(await sharp(SRC).trim({ threshold: 12 }).toBuffer())
    .resize(420, 420, { fit: "contain", background: "#ffffff" })
    .toBuffer();
  const og = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: ogMark, gravity: "center" }])
    .png()
    .toBuffer();
  writeFileSync(join(PUB, "og-image.png"), og);
  console.log("✓ og-image.png");

  console.log("\nBarcha ikonkalar tayyor.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
