import { NextRequest } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// Aqlli rasm API'si — menyu rasmini bir xil formatga keltiradi.
//
//   /api/img?src=/media/xxx.webp&w=900&h=1125
//
// `sharp` rasmni tahlil qilib, eng "muhim" (taom) qismini topadi
// (attention strategiyasi) va uni berilgan nisbatga aqlli kesadi —
// idish/taom kesilib qolmaydi, hamma rasm bir tekis, to'la va aniq ko'rinadi.
// Cho'zish/buzish yo'q (nisbat saqlanadi, ortiqchasi kesiladi).
//
// Asl fayl o'zgarmaydi — bu faqat KO'RSATISH uchun nusxa. Natija diskка
// keshlanadi (qayta ishlanmaydi) va uzoq muddat brauzer keshiga beriladi.
// Xavfsizlik: faqat o'zimizning yuklangan fayllar (/media, /uploads) qayta
// ishlanadi (SSRF himoyasi); tashqi URL asl holida qaytariladi.
// ─────────────────────────────────────────────

const MAX_DIM = 1600;
const CACHE_DIR = path.join(UPLOAD_DIR, "_imgcache");

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}

// Faqat o'zimizning yuklangan fayl yo'lini qaytaradi (traversal himoyasi bilan)
function localUploadPath(src: string): string | null {
  if (src.startsWith("/media/") || src.startsWith("/uploads/")) {
    return path.join(UPLOAD_DIR, path.basename(src));
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const src = sp.get("src") || "";
  const w = clamp(parseInt(sp.get("w") || "800", 10), 32, MAX_DIM);
  const h = clamp(parseInt(sp.get("h") || "800", 10), 32, MAX_DIM);

  const local = localUploadPath(src);
  if (!local) {
    // Tashqi (POS import) yoki notanish manba — asl rasmga yo'naltiramiz
    if (/^https?:\/\//.test(src)) return Response.redirect(src, 302);
    return new Response("Bad src", { status: 400 });
  }

  // ── Disk kesh: bir marta ishlangach qayta ishlanmaydi ──
  const key = crypto.createHash("sha1").update(`${src}|${w}|${h}|v1`).digest("hex");
  const cachePath = path.join(CACHE_DIR, `${key}.webp`);

  try {
    const cached = await readFile(cachePath);
    return webp(cached);
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
    const out = await sharp(input)
      .rotate() // EXIF yo'nalishini to'g'rilaydi
      .resize(w, h, {
        fit: "cover",
        position: sharp.strategy.attention, // aqlli kesish — taomni saqlaydi
      })
      .webp({ quality: 82 })
      .toBuffer();

    // Keshga yozamiz (best-effort — yozib bo'lmasa ham javob beramiz)
    mkdir(CACHE_DIR, { recursive: true })
      .then(() => writeFile(cachePath, out))
      .catch(() => {});

    return webp(out);
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

function webp(buf: Buffer): Response {
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
