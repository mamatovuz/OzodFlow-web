import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, encryptPasswordPlain } from "@/lib/auth";
import { registerStartSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { randomCode } from "@/lib/utils";
import { FREE_TRIAL_DAYS } from "@/lib/plans";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendEmail, verifyCodeEmail, emailConfigured } from "@/lib/email";

// Yangi oqim: email + parol + ism qabul qiladi. Foydalanuvchi va restoranni
// (onboarding'siz, tasdiqlanmagan holatda) yaratadi va pochtaga tasdiqlash
// kodini yuboradi. Sessiya HALI ochilmaydi — kod tasdiqlangach ochiladi.
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "register", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  if (!emailConfigured()) {
    return fail("Email xizmati sozlanmagan. Administrator bilan bog'laning.", 503);
  }

  const body = await req.json().catch(() => null);
  const parsed = registerStartSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  // Allaqachon ro'yxatdan o'tganmi?
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    if (existing.emailVerified) {
      return fail("Bu email allaqachon ro'yxatdan o'tgan. Kirish sahifasidan foydalaning.", 409);
    }
    // Tasdiqlanmagan — yangi kod yuboramiz (qayta ro'yxatdan o'tishga urinsa).
    const code = await issueCode(email);
    const mail = verifyCodeEmail(code, existing.name);
    await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    return ok({ needVerify: true, email }, 200);
  }

  const hashed = await hashPassword(password);

  // Placeholder restoran (nomi onboarding'da beriladi). onboarded=false.
  let baseSlug = "restoran";
  let slug = `${baseSlug}-${randomCode(6).toLowerCase()}`;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${randomCode(6).toLowerCase()}`;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      passwordEnc: encryptPasswordPlain(password),
      emailVerified: false,
      restaurants: {
        create: {
          name: "Mening restoranim",
          slug,
          onboarded: false,
          plan: "FREE",
          planUntil: new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const code = await issueCode(email);
  const mail = verifyCodeEmail(code, name);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
  if (!sent) {
    return fail("Tasdiqlash kodi yuborilmadi. Keyinroq urinib ko'ring.", 502);
  }

  return ok({ needVerify: true, email }, 201);
}

// 6 xonali tasdiqlash kodini yaratib DB'ga yozadi (eski kodlarni tozalab).
async function issueCode(email: string): Promise<string> {
  await prisma.verifyCode.deleteMany({ where: { email } });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.verifyCode.create({
    data: { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  return code;
}
