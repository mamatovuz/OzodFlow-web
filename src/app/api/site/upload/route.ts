import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";
import { UPLOAD_DIR } from "@/lib/uploads";
import { isSiteAdmin } from "@/lib/site";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DIM = 1600;

// Shaxsiy sayt uchun rasm yuklash — natija /media/<nom> sifatida qaytadi.
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-upload", { limit: 30, windowMs: WINDOW.minute });
  if (limited) return limited;

  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return fail("Fayl topilmadi", 422);
  if (!ALLOWED.includes(file.type)) return fail("Faqat rasm fayllari (JPG, PNG, WEBP)", 422);
  if (file.size > MAX_SIZE) return fail("Fayl hajmi 25MB dan oshmasligi kerak", 422);

  const input = Buffer.from(await file.arrayBuffer());
  let bytes: Buffer;
  let ext: string;
  if (file.type === "image/gif") {
    bytes = input;
    ext = "gif";
  } else {
    bytes = await sharp(input)
      .rotate()
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    ext = "webp";
  }

  const name = `site-${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  const url = `/media/${name}`;
  // Rasm kutubxonasiga yozamiz (qayta ishlatish uchun)
  await prisma.siteMedia.create({ data: { url } }).catch(() => {});
  return ok({ url });
}
