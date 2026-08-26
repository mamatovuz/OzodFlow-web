import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { authGuard, ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";
import { UPLOAD_DIR } from "@/lib/uploads";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB kiruvchi rasm (siqishdan oldin) — qabul qilingach webp'ga siqiladi
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DIM = 1280; // eng katta tomon (px) — menyu uchun yetarli
const WEBP_QUALITY = 78;
// Bosh sahifa (hero) videosi uchun — sharp ishlamaydi, to'g'ridan-to'g'ri saqlanadi
const VIDEO_ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];
const VIDEO_MAX_SIZE = 30 * 1024 * 1024; // 30MB

export async function POST(req: NextRequest) {
  // Disk to'ldirish/spam himoyasi: IP bo'yicha daqiqasiga 30 yuklash
  const limited = limitOrReject(req, "upload", { limit: 30, windowMs: WINDOW.minute });
  if (limited) return limited;

  const { user, res } = await authGuard();
  if (!user) return res;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return fail("Fayl topilmadi", 422);

  // ─── Video (hero) — siqilmasdan saqlanadi ───
  if (VIDEO_ALLOWED.includes(file.type)) {
    if (file.size > VIDEO_MAX_SIZE) {
      return fail("Video hajmi 30MB dan oshmasligi kerak", 422);
    }
    const vbuf = Buffer.from(await file.arrayBuffer());
    const vext = file.type === "video/webm" ? "webm" : "mp4";
    const vname = `${Date.now()}-${randomCode(6).toLowerCase()}.${vext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, vname), vbuf);
    return ok({ url: `/media/${vname}`, kind: "video" });
  }

  if (!ALLOWED.includes(file.type)) {
    return fail("Faqat rasm (JPG, PNG, WEBP) yoki video (MP4, WEBM) fayllari", 422);
  }
  if (file.size > MAX_SIZE) {
    return fail("Fayl hajmi 50MB dan oshmasligi kerak", 422);
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
  return ok({ url: `/media/${filename}`, kind: "image" });
}
