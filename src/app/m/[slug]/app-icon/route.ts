import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Restoran logosini PWA install ikonkasi uchun kvadrat PNG qilib beradi.
// Foydalanuvchi menyuni telefonga o'rnatganda aynan shu restoran ilovasi
// (logosi bilan) chiqishi uchun ishlatiladi.  /m/<slug>/app-icon?s=192|512
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const size = Math.min(
    1024,
    Math.max(48, parseInt(req.nextUrl.searchParams.get("s") || "512", 10) || 512)
  );

  const restaurant = await prisma.restaurant
    .findUnique({ where: { slug }, select: { logo: true } })
    .catch(() => null);

  // Manba baytlarini olamiz (logo yoki umumiy OzodFlow ikonkasi)
  async function loadSource(): Promise<Buffer | null> {
    const logo = restaurant?.logo;
    try {
      if (logo?.startsWith("/media/")) {
        return await readFile(path.join(UPLOAD_DIR, path.basename(logo)));
      }
      if (logo && /^https?:\/\//.test(logo)) {
        const r = await fetch(logo);
        if (r.ok) return Buffer.from(await r.arrayBuffer());
      }
    } catch {
      /* pastda fallback */
    }
    // Fallback — public/ dagi OzodFlow ikonkasi
    try {
      return await readFile(
        path.join(process.cwd(), "public", "favicon-512.png")
      );
    } catch {
      return null;
    }
  }

  const src = await loadSource();
  if (!src) return new Response("Not found", { status: 404 });

  try {
    const png = await sharp(src)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
