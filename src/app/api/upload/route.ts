import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { authGuard, ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";
import { UPLOAD_DIR } from "@/lib/uploads";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB kiruvchi (siqishdan oldin)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DIM = 1280; // eng katta tomon (px) — menyu uchun yetarli
const WEBP_QUALITY = 78;

export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return fail("Fayl topilmadi", 422);

  if (!ALLOWED.includes(file.type)) {
    return fail("Faqat rasm fayllari (JPG, PNG, WEBP)", 422);
  }
  if (file.size > MAX_SIZE) {
    return fail("Fayl hajmi 10MB dan oshmasligi kerak", 422);
  }

  const input = Buffer.from(await file.arrayBuffer());

  // Rasmni siqamiz va webp'ga o'giramiz: hajmni keskin kamaytiradi
  // (GIF animatsiyani buzmaslik uchun tegmasdan qo'yamiz).
  let bytes: Buffer;
  let ext: string;
  try {
    if (file.type === "image/gif") {
      bytes = input;
      ext = "gif";
    } else {
      bytes = await sharp(input)
        .rotate() // EXIF yo'nalishini to'g'rilaydi
        .resize({
          width: MAX_DIM,
          height: MAX_DIM,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      ext = "webp";
    }
  } catch {
    // Siqib bo'lmasa (buzuq fayl va h.k.) — asl faylni saqlaymiz
    bytes = input;
    ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  }

  const filename = `${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  // Fayl /media/<nom> orqali xizmat qilinadi (volume'da ham ishlaydi)
  return ok({ url: `/media/${filename}` });
}
