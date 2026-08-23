import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { apkFilePath, apkDownloadUrl, formatBytes } from "@/lib/mobile-app";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GitHub Actions build workflow tugagach imzolangan .apk ni shu yerga yuboradi.
// Auth: ?secret= query (APK_BUILD_SECRET env bilan mos kelishi shart).
// Body: multipart form-data, `file` = app-release-signed.apk
//   yoki ?status=failed — build muvaffaqiyatsiz tugaganini bildiradi.
export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const secret = req.nextUrl.searchParams.get("secret") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const expected = process.env.APK_BUILD_SECRET || "";
  if (!expected || secret !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  const restaurant = await prisma.restaurant
    .findUnique({ where: { slug }, select: { id: true, slug: true } })
    .catch(() => null);
  if (!restaurant) return new Response("Restaurant not found", { status: 404 });

  // Build muvaffaqiyatsiz
  if (status === "failed") {
    await prisma.mobileApp
      .update({ where: { restaurantId: restaurant.id }, data: { status: "FAILED" } })
      .catch(() => null);
    return Response.json({ ok: true });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return new Response("No file", { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 1024) return new Response("Empty file", { status: 400 });

  const dest = apkFilePath(restaurant.slug);
  try {
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  } catch (e) {
    log.error("mobile_app_upload_write", {
      err: e instanceof Error ? e.message : String(e),
    });
    return new Response("Write failed", { status: 500 });
  }

  const app = await prisma.mobileApp.update({
    where: { restaurantId: restaurant.id },
    data: {
      status: "READY",
      apkUrl: apkDownloadUrl(restaurant.slug),
      apkSize: formatBytes(bytes.length),
      lastBuiltAt: new Date(),
    },
  });

  log.info("mobile_app_uploaded", { slug: restaurant.slug, size: bytes.length });
  return Response.json({ ok: true, version: app.version });
}
