import { NextRequest } from "next/server";
import { open, stat } from "fs/promises";
import path from "path";
import { UPLOAD_DIR, contentTypeFor, isVideoFile } from "@/lib/uploads";

// Yuklangan fayllarni (rasm/video) xizmat qiladi (UPLOAD_DIR — volume bo'lishi mumkin).
// Video uchun HTTP Range (206) qo'llab-quvvatlanadi — aks holda brauzer videoni
// o'ynatmaydi/oldinga o'tkaza olmaydi. Video to'liq yuklanmasa ham ko'rina veradi.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Xavfsizlik: faqat fayl nomi, path traversalga yo'l qo'ymaslik
  const safe = path.basename(name);
  if (safe !== name || safe.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, safe);
  const contentType = contentTypeFor(safe);

  let size: number;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error("not a file");
    size = s.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = req.headers.get("range");

  // Range so'rovi (odatda video) — 206 Partial Content
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : size - 1;
      // Video uchun bo'lakni cheklaymiz (bir so'rovda ~1MB) — silliq striming
      const MAX_CHUNK = 1024 * 1024;
      if (isVideoFile(safe) && end - start + 1 > MAX_CHUNK) {
        end = start + MAX_CHUNK - 1;
      }
      if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= size) {
        return new Response("Range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      const len = end - start + 1;
      const fh = await open(filePath, "r");
      try {
        const buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, start);
        return new Response(new Uint8Array(buf), {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(len),
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } finally {
        await fh.close();
      }
    }
  }

  // Range yo'q — to'liq fayl (rasm yoki video birinchi so'rov)
  try {
    const fh = await open(filePath, "r");
    try {
      const buf = Buffer.alloc(size);
      await fh.read(buf, 0, size, 0);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(size),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } finally {
      await fh.close();
    }
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
