import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendEmail, resetLinkEmail, emailConfigured } from "@/lib/email";
import { requestOrigin } from "@/lib/google";

// Restoran egasi: parolni tiklash havolasini emailga yuboradi.
// Body: { email }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "forgot", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) return fail("Email kiriting", 422);

  if (!emailConfigured()) {
    return fail("Email xizmati sozlanmagan. Administrator bilan bog'laning.", 503);
  }

  const user = await prisma.user.findFirst({ where: { email } });
  // Xavfsizlik: email topilmasa ham "yuborildi" deymiz (enumeratsiyani oldini olish)
  if (!user || !user.email) return ok({ sent: true });

  // Eski tiklash yozuvlarini tozalab, yangi token yaratamiz
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      code: "",
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 daqiqa
    },
  });

  const url = `${requestOrigin(req)}/reset?token=${token}`;
  const mail = resetLinkEmail(url, user.name);
  await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });

  return ok({ sent: true });
}
