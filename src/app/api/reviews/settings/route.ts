import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { sendTestMessage } from "@/lib/order-telegram";

// Izoh sozlamalari (egasi): yoqish, xarita havolalari, chegara, alohida kanal.
export async function PATCH(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Noto'g'ri ma'lumot", 422);

  const data: Record<string, unknown> = {};

  if (typeof body.reviewEnabled === "boolean") data.reviewEnabled = body.reviewEnabled;
  if (typeof body.reviewGoogleUrl === "string") data.reviewGoogleUrl = body.reviewGoogleUrl.trim().slice(0, 500) || null;
  if (typeof body.reviewYandexUrl === "string") data.reviewYandexUrl = body.reviewYandexUrl.trim().slice(0, 500) || null;
  if (body.reviewThreshold != null) {
    const t = Math.round(Number(body.reviewThreshold));
    if (t >= 1 && t <= 5) data.reviewThreshold = t;
  }

  // Alohida izoh kanali: ikkalasi berilsa — test qilamiz; bo'sh bo'lsa — tozalaymiz
  if (body.reviewBotToken !== undefined || body.reviewChatId !== undefined) {
    const token = String(body.reviewBotToken || "").trim();
    const chatId = String(body.reviewChatId || "").trim();
    if (!token && !chatId) {
      data.reviewBotToken = null;
      data.reviewChatId = null;
    } else if (token && chatId) {
      const okTest = await sendTestMessage(token, chatId, restaurant.name);
      if (!okTest) {
        return fail("Kanalga ulanib bo'lmadi. Token/kanal ID ni tekshiring va botni kanalga admin qiling.", 400);
      }
      data.reviewBotToken = token;
      data.reviewChatId = chatId;
    } else {
      return fail("Token va kanal ID ikkalasi ham kerak", 422);
    }
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data,
    select: {
      reviewEnabled: true,
      reviewGoogleUrl: true,
      reviewYandexUrl: true,
      reviewThreshold: true,
      reviewBotToken: true,
      reviewChatId: true,
    },
  });

  return ok({
    ...updated,
    hasReviewChannel: !!(updated.reviewBotToken && updated.reviewChatId),
  });
}
