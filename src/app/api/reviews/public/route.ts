import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";
import { sendReviewToChannel } from "@/lib/order-telegram";

// Mijoz QR orqali izoh (otziv) qoldiradi. Ommaviy, rate-limit bilan.
// Body: { slug, rating, name?, phone?, text? }
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "review-public", { limit: 8, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug || "").trim();
  const rating = Math.round(Number(body?.rating));
  const name = String(body?.name || "").trim().slice(0, 80) || null;
  const phone = String(body?.phone || "").trim().slice(0, 40) || null;
  const text = String(body?.text || "").trim().slice(0, 1000) || null;

  if (!slug) return fail("Restoran topilmadi", 404);
  if (!rating || rating < 1 || rating > 5) return fail("Bahoni tanlang", 422);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      currency: true,
      reviewEnabled: true,
      reviewBotToken: true,
      reviewChatId: true,
      reviewGoogleUrl: true,
      reviewYandexUrl: true,
      reviewThreshold: true,
      orderBotToken: true,
      orderChatId: true,
    },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);
  if (!restaurant.reviewEnabled) return fail("Izohlar vaqtincha o'chirilgan", 403);

  // Yuqori baho bo'lsa — xaritaga yo'naltiramiz (ommaviy baho uchun)
  const mapUrl = restaurant.reviewGoogleUrl || restaurant.reviewYandexUrl || null;
  const redirectUrl = rating >= restaurant.reviewThreshold && mapUrl ? mapUrl : null;

  await prisma.review.create({
    data: {
      restaurantId: restaurant.id,
      rating,
      name,
      phone,
      text,
      redirected: !!redirectUrl,
    },
  });

  // Telegram kanaliga yuboramiz (izoh kanali bo'lmasa — buyurtma kanali)
  const token = restaurant.reviewBotToken || restaurant.orderBotToken;
  const chatId = restaurant.reviewChatId || restaurant.orderChatId;
  if (token && chatId) {
    sendReviewToChannel({
      token,
      chatId,
      restaurantName: restaurant.name,
      rating,
      name,
      phone,
      text,
    }).catch(() => {});
  }

  return ok({ saved: true, redirectUrl }, 201);
}
