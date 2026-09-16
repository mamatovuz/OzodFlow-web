import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendEmail, verifyCodeEmail } from "@/lib/email";

// Tasdiqlash kodini qayta yuboradi (tasdiqlanmagan foydalanuvchi uchun).
// Body: { email }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "resend-code", { limit: 3, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) return fail("Email kiriting", 422);

  const user = await prisma.user.findFirst({ where: { email } });
  // Enumeratsiyani oldini olish: mavjud bo'lmasa ham "yuborildi" deymiz
  if (!user || user.emailVerified) return ok({ sent: true });

  await prisma.verifyCode.deleteMany({ where: { email } });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.verifyCode.create({
    data: { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  const mail = verifyCodeEmail(code, user.name);
  await sendEmail({ to: email, subject: mail.subject, html: mail.html });
  return ok({ sent: true });
}
