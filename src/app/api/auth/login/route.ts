import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, encryptPasswordPlain } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW, clientIp } from "@/lib/rate-limit";
import { deviceFingerprint } from "@/lib/device";
import { sendEmail, verifyCodeEmail, emailConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  // Brute-force himoyasi: IP bo'yicha daqiqasiga 10 urinish
  const limited = limitOrReject(req, "login", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { password } = parsed.data;
  // Email/telefonni normallashtirish: bo'sh joy va katta harflarni tozalash
  // (telefon/brauzer birinchi harfni avto-katta qilishi mumkin)
  const identifier = parsed.data.identifier.trim();
  const lower = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: lower },
        { email: identifier },
        { phone: identifier },
        { phone: lower },
      ],
    },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    return fail("Email/telefon yoki parol noto'g'ri", 401);
  }

  // Email tasdiqlanmagan bo'lsa — sessiya ochmaymiz, yangi kod yuboramiz.
  if (!user.emailVerified && user.email) {
    if (emailConfigured()) {
      await prisma.verifyCode.deleteMany({ where: { email: user.email } });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await prisma.verifyCode.create({
        data: { email: user.email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      const mail = verifyCodeEmail(code, user.name);
      await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
    }
    return ok({ needVerify: true, email: user.email });
  }

  // Qurilma bloklanganmi? Egasi bu qurilmani bloklagan bo'lsa — kira olmaydi.
  const userAgent = req.headers.get("user-agent") || undefined;
  const ip = clientIp(req);
  const fingerprint = deviceFingerprint(userAgent);
  const blocked = await prisma.blockedDevice
    .findUnique({
      where: { userId_fingerprint: { userId: user.id, fingerprint } },
    })
    .catch(() => null);
  if (blocked) {
    return fail("Bu qurilma bloklangan. Restoran egasi bilan bog'laning.", 403);
  }

  // Admin ko'rishi uchun ochiq parol nusxasini yozib qo'yamiz (agar hali yo'q bo'lsa).
  // Eski hisoblar ham kirgan sari to'ldiriladi.
  if (!user.passwordEnc) {
    await prisma.user
      .update({ where: { id: user.id }, data: { passwordEnc: encryptPasswordPlain(password) } })
      .catch(() => {});
  }

  await createSession(user.id, { userAgent, ip });

  // Yo'naltirish manzilini aniqlaymiz
  let redirect = "/dashboard";
  if (user.role === "ADMIN") {
    redirect = "/admins";
  } else {
    const owns = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
    if (owns) {
      // Onboarding tugamagan bo'lsa — avval o'sha yerga
      if (!owns.onboarded) redirect = "/onboarding";
    } else {
      const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
      if (membership) redirect = membership.role === "MANAGER" ? "/dashboard" : "/staff";
    }
  }

  return ok({ id: user.id, name: user.name, role: user.role, redirect });
}
