import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR, contentTypeFor } from "@/lib/uploads";

// Yuklangan rasmlarni xizmat qiladi (UPLOAD_DIR — volume bo'lishi mumkin)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Xavfsizlik: faqat fayl nomi, path traversalga yo'l qo'ymaslik
  const safe = path.basename(name);
  if (safe !== name || safe.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, safe));
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(safe),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
