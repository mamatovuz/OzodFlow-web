import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendEmail, adminCodeEmail, emailConfigured } from "@/lib/email";

// Admin parolni tiklash — Telegram bot orqali kod yuboradi
// Body: { email }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "admin-forgot", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  if (!email) return fail("Email kiriting", 422);

  // Kod yuborish kanallaridan hech biri sozlanmagan bo'lsa — xato
  if (!isTelegramConfigured() && !emailConfigured()) {
    return fail(
      "Kod yuborish xizmati sozlanmagan. Iltimos, administrator bilan bog'laning.",
      503
    );
  }

  const user = await prisma.user.findFirst({
    where: { email, role: "ADMIN" },
  });

  // Xavfsizlik: email admin bo'lmasa ham "yuborildi" deymiz (enumeratsiyani oldini olish)
  if (!user) return ok({ sent: true });

  // Eski kodlarni tozalash, yangi 6 xonali kod
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 daqiqa
    },
  });

  // 1) Admin pochtasiga chiroyli xat (kod bilan)
  let sent = false;
  if (emailConfigured() && user.email) {
    const mail = adminCodeEmail(code);
    sent = await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
  }

  // 2) Telegram kanaliga habar (xavfsizlik ogohlantirishi + kod)
  if (isTelegramConfigured()) {
    const tg = await sendTelegramMessage(
      `🔐 <b>OzodFlow admin</b>\nParolni tiklash so'raldi: <b>${email}</b>\nKod: <b>${code}</b>\n\nBu kod 10 daqiqa amal qiladi. Agar so'rov sizdan bo'lmasa, e'tiborsiz qoldiring.`
    );
    sent = sent || tg;
  }

  if (!sent) return fail("Kod yuborishda xatolik. Keyinroq urinib ko'ring.", 502);

  return ok({ sent: true });
}
