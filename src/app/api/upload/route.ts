import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authGuard, ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";
import { UPLOAD_DIR } from "@/lib/uploads";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
    return fail("Fayl hajmi 5MB dan oshmasligi kerak", 422);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  // Fayl /media/<nom> orqali xizmat qilinadi (volume'da ham ishlaydi)
  return ok({ url: `/media/${filename}` });
}
