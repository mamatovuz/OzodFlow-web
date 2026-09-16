import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { exchangeCodeForProfile, googleConfigured, requestOrigin, GOOGLE_STATE_COOKIE } from "@/lib/google";
import { slugify, randomCode } from "@/lib/utils";
import { FREE_TRIAL_DAYS } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Google roziligidan qaytish nuqtasi. Kodni almashtirib profil oladi,
// foydalanuvchini topadi yoki yaratadi, sessiya ochib panelга yo'naltiradi.
export async function GET(req: NextRequest) {
  // MUHIM: redirect bazasi req.url EMAS — proksi ortida u localhost:PORT bo'ladi.
  // Kanonik origin (prod: NEXT_PUBLIC_APP_URL) ishlatamiz.
  const origin = requestOrigin(req);
  const url = new URL(req.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, origin));

  if (!googleConfigured()) return fail("google_off");

  // Google xato qaytardi (foydalanuvchi bekor qildi va h.k.)
  if (url.searchParams.get("error")) return fail("google_cancel");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("google");

  // CSRF: state cookie bilan mos kelishi shart
  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_STATE_COOKIE);
  if (!savedState || savedState !== state) return fail("google_state");

  const profile = await exchangeCodeForProfile(req, code);
  if (!profile || !profile.email) return fail("google");

  const userAgent = req.headers.get("user-agent") || undefined;

  // 1) Google ID bo'yicha topamiz
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  // 2) Bo'lmasa — email bo'yicha (mavjud hisobga Google'ni bog'laymiz)
  if (!user && profile.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          avatar: byEmail.avatar || profile.picture || undefined,
        },
      });
    }
  }

  // 3) Umuman yangi foydalanuvchi — hisob + restoran yaratamiz (register kabi)
  if (!user) {
    const firstName = profile.name.split(/\s+/)[0] || "Restoran";
    const restaurantName = `${firstName} restorani`;
    let baseSlug = slugify(restaurantName) || "restoran";
    let slug = baseSlug;
    while (await prisma.restaurant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${randomCode(4).toLowerCase()}`;
    }
    // Parolsiz kirgani uchun tasodifiy (topib bo'lmaydigan) parol qo'yamiz.
    const randomPassword = await hashPassword(crypto.randomUUID() + randomCode(12));

    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.sub,
        avatar: profile.picture,
        password: randomPassword,
        emailVerified: true, // Google emailni allaqachon tasdiqlagan
        restaurants: {
          create: {
            name: restaurantName,
            slug,
            onboarded: false, // restoran nomi + tarif onboarding'da beriladi
            plan: "FREE",
            planUntil: new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
  }

  // Sessiya ochamiz
  await createSession(user.id, { userAgent });

  // Yo'naltirish (login route bilan bir xil mantiq)
  let redirect = "/dashboard";
  if (user.role === "ADMIN") {
    redirect = "/admins";
  } else {
    const owns = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
    if (owns) {
      if (!owns.onboarded) redirect = "/onboarding";
    } else {
      const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
      if (membership) redirect = membership.role === "MANAGER" ? "/dashboard" : "/staff";
    }
  }

  return NextResponse.redirect(new URL(redirect, origin));
}
