import { NextRequest } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// Aqlli rasm API'si — menyu rasmini bir xil, premium formatga keltiradi.
//
//   /api/img?src=/media/xxx.webp&w=900&h=1125&pos=attention
//
//  • Aqlli kesish (attention) — taom qismini saqlab, berilgan nisbatga keltiradi.
//    pos bilan boshqarish mumkin: attention (default) | entropy | center | top | bottom.
//  • Taomni "jonlantirish": yengil sharpen + rang jozibasi (ishtaha ochadi, buzmaydi).
//  • AVIF: brauzer qo'llasa AVIF (kichikroq, o'tkir), aks holda WebP.
//  • Disk kesh: bir marta ishlangach qayta ishlanmaydi.
//  • Xavfsizlik: faqat o'z yuklangan fayllarimiz; tashqi URL asl holida qaytadi.
// ─────────────────────────────────────────────

const MAX_DIM = 2000;
const CACHE_DIR = path.join(UPLOAD_DIR, "_imgcache");
const ENHANCE_VERSION = "v2"; // sozlama o'zgarsa kesh yangilansin

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}

function localUploadPath(src: string): string | null {
  if (src.startsWith("/media/") || src.startsWith("/uploads/")) {
    return path.join(UPLOAD_DIR, path.basename(src));
  }
  return null;
}

// pos → sharp resize position/strategy (sharp satr qiymatlarni qabul qiladi)
function resolvePosition(pos: string): string {
  switch (pos) {
    case "entropy":
      return "entropy";
    case "center":
    case "centre":
      return "centre";
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "left":
      return "left";
    case "right":
      return "right";
    default:
      return "attention";
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const src = sp.get("src") || "";
  const w = clamp(parseInt(sp.get("w") || "800", 10), 32, MAX_DIM);
  const h = clamp(parseInt(sp.get("h") || "800", 10), 32, MAX_DIM);
  const pos = (sp.get("pos") || "attention").toLowerCase();

  // AVIF qo'llab-quvvatlanadimi? (brauzer Accept sarlavhasi)
  const accept = req.headers.get("accept") || "";
  const useAvif = accept.includes("image/avif");
  const fmt = useAvif ? "avif" : "webp";

  const local = localUploadPath(src);
  if (!local) {
    if (/^https?:\/\//.test(src)) return Response.redirect(src, 302);
    return new Response("Bad src", { status: 400 });
  }

  // ── Disk kesh (format + pozitsiya + versiya bo'yicha) ──
  const key = crypto
    .createHash("sha1")
    .update(`${src}|${w}|${h}|${pos}|${fmt}|${ENHANCE_VERSION}`)
    .digest("hex");
  const cachePath = path.join(CACHE_DIR, `${key}.${fmt}`);

  try {
    return imgResponse(await readFile(cachePath), fmt);
  } catch {
    /* kesh yo'q — ishlaymiz */
  }

  let input: Buffer;
  try {
    input = await readFile(local);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  try {
    let pipe = sharp(input)
      .rotate() // EXIF yo'nalishini to'g'rilaydi
      .resize(w, h, { fit: "cover", position: resolvePosition(pos) })
      // ── Taomni "jonlantirish" (yengil — tabiiylikni buzmaydi) ──
      .modulate({ saturation: 1.06, brightness: 1.02 }) // rang jozibasi
      .sharpen({ sigma: 0.7 }); // yumshoq o'tkirlik

    pipe = useAvif
      ? pipe.avif({ quality: 62, effort: 4 })
      : pipe.webp({ quality: 82 });

    const out = await pipe.toBuffer();

    mkdir(CACHE_DIR, { recursive: true })
      .then(() => writeFile(cachePath, out))
      .catch(() => {});

    return imgResponse(out, fmt);
  } catch {
    // Qayta ishlab bo'lmasa — asl faylni o'zi qaytaramiz (buzilmasin)
    try {
      return new Response(new Uint8Array(input), {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    } catch {
      return new Response("Process failed", { status: 500 });
    }
  }
}

function imgResponse(buf: Buffer, fmt: string): Response {
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": `image/${fmt}`,
      "Cache-Control": "public, max-age=604800, immutable",
      Vary: "Accept",
    },
  });
}
