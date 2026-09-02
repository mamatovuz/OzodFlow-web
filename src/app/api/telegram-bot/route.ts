import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, ok, fail } from "@/lib/api";
import {
  getBotInfo,
  configureBot,
  removeWebhook,
  makeBotSecret,
} from "@/lib/telegram-bot";

async function ownedRestaurant(userId: string) {
  return prisma.restaurant.findFirst({ where: { ownerId: userId } });
}

// Bot holati
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const r = await ownedRestaurant(user.id);
  if (!r) return fail("Restoran topilmadi", 404);
  return ok({
    enabled: r.botEnabled && !!r.botToken,
    username: r.botUsername,
    slug: r.slug,
  });
}

const schema = z.object({ token: z.string().min(20, "Bot token noto'g'ri") });

// Botni ulash: token tekshiriladi → webhook/menyu/buyruqlar sozlanadi → saqlanadi
export async function POST(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const r = await ownedRestaurant(user.id);
  if (!r) return fail("Faqat restoran egasi botni ulaydi", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Bot token kiriting", 422);
  const token = parsed.data.token.trim();

  // 1) Token haqiqiyligini tekshiramiz
  const info = await getBotInfo(token);
  if (!info) return fail("Token noto'g'ri yoki bot topilmadi. BotFather'dan tekshiring.", 400);

  // 2) Bu token boshqa restoranда ishlatilganmi?
  const taken = await prisma.restaurant.findFirst({
    where: { botToken: token, id: { not: r.id } },
    select: { id: true },
  });
  if (taken) return fail("Bu bot boshqa restoranga ulangan", 409);

  // 3) Webhook + menyu tugmasi + buyruqlarni sozlaymiz
  const secret = r.botSecret || makeBotSecret();
  const configured = await configureBot({
    token,
    slug: r.slug,
    secret,
    restaurantName: r.name,
  });
  if (!configured) return fail("Botni sozlab bo'lmadi. Keyinroq urinib ko'ring.", 502);

  await prisma.restaurant.update({
    where: { id: r.id },
    data: {
      botToken: token,
      botUsername: info.username,
      botSecret: secret,
      botEnabled: true,
    },
  });

  return ok({ username: info.username });
}

// Botni uzish
export async function DELETE() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const r = await ownedRestaurant(user.id);
  if (!r) return fail("Restoran topilmadi", 404);

  if (r.botToken) await removeWebhook(r.botToken);
  await prisma.restaurant.update({
    where: { id: r.id },
    data: { botToken: null, botUsername: null, botEnabled: false },
  });
  return ok({ disconnected: true });
}
