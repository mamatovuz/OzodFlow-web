import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { apkFilePath } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tayyor APK ni ommaviy yuklab olish (o'z domenimizdan — ishonchli va brendli).
// Har yuklab olishda hisoblagichni oshiradi.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant
    .findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, mobileApp: { select: { appName: true } } },
    })
    .catch(() => null);
  if (!restaurant) return new Response("Not found", { status: 404 });

  const file = apkFilePath(restaurant.slug);
  try {
    const s = await stat(file);
    if (!s.isFile() || s.size < 1024) throw new Error("no apk");
  } catch {
    return new Response("Ilova hali tayyor emas", { status: 404 });
  }

  const bytes = await readFile(file);

  // Yuklab olishlar sonini oshiramiz (best-effort, yuklashni bloklamaydi).
  prisma.mobileApp
    .update({
      where: { restaurantId: restaurant.id },
      data: { downloads: { increment: 1 } },
    })
    .catch(() => null);

  const fileName = `${(restaurant.mobileApp?.appName || restaurant.name)
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "ilova"}.apk`;

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
