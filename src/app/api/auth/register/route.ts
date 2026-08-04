import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { slugify, randomCode } from "@/lib/utils";
import { FREE_TRIAL_DAYS } from "@/lib/plans";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "register", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const { name, password, restaurantName } = parsed.data;
  // Email har doim kichik harfda saqlanadi (login mosligi uchun)
  const email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : "";
  const phone = parsed.data.phone ? parsed.data.phone.trim() : "";
  if (!email && !phone) {
    return fail("Email yoki telefon kiritilishi shart", 422);
  }

  // Mavjudligini tekshirish
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  if (existing) {
    return fail("Bu email yoki telefon allaqachon ro'yxatdan o'tgan", 409);
  }

  const hashed = await hashPassword(password);

  // Noyob slug yaratish
  let baseSlug = slugify(restaurantName) || "restoran";
  let slug = baseSlug;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${randomCode(4).toLowerCase()}`;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      password: hashed,
      restaurants: {
        create: {
          name: restaurantName,
          slug,
          plan: "FREE",
          planUntil: new Date(
            Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000
          ),
        },
      },
    },
  });

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return ok({ id: user.id, name: user.name }, 201);
}
