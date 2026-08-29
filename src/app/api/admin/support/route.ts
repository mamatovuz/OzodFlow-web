import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGuard, ok, fail } from "@/lib/api";

const TOPICS = ["BLOCK", "PAYMENT", "CONTACT", "GENERAL"];

// Bosh admin: barcha yozishmalar yoki bitta restoran bo'yicha
export async function GET(req: NextRequest) {
  const { user, res } = await adminGuard("messages");
  if (!user) return res;

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (restaurantId) {
    const messages = await prisma.supportMessage.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
    });
    return ok(messages);
  }

  // Har bir restoran uchun xabarlar sonini va oxirgi xabarni jamlaymiz
  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: { select: { id: true, name: true, slug: true, isBlocked: true } },
    },
  });

  const threadsMap = new Map<string, {
    restaurant: { id: string; name: string; slug: string; isBlocked: boolean };
    lastAt: Date;
    lastBody: string;
    unread: number;
    total: number;
  }>();
  for (const m of messages) {
    if (!m.restaurant) continue;
    const key = m.restaurantId;
    let t = threadsMap.get(key);
    if (!t) {
      t = { restaurant: m.restaurant, lastAt: m.createdAt, lastBody: m.body, unread: 0, total: 0 };
      threadsMap.set(key, t);
    }
    t.total++;
    if (!m.isRead && m.sender !== "ADMIN") t.unread++;
  }

  return ok(Array.from(threadsMap.values()));
}

// Bosh admin javob yozadi (yoki "nega to'lamadingiz?" so'roviga xabar)
export async function POST(req: NextRequest) {
  const { user, res } = await adminGuard("messages");
  if (!user) return res;

  const body = await req.json().catch(() => null);
  const restaurantId = String(body?.restaurantId || "");
  const text = String(body?.body || "").trim();
  const topic = TOPICS.includes(body?.topic) ? body.topic : "GENERAL";
  if (!restaurantId || !text) return fail("Ma'lumot to'liq emas", 422);
  if (text.length > 2000) return fail("Xabar juda uzun", 422);

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const msg = await prisma.supportMessage.create({
    data: { restaurantId, topic, sender: "ADMIN", body: text },
  });
  return ok(msg, 201);
}

// Restoran yozishmalarini o'qilgan deb belgilash
export async function PATCH(req: NextRequest) {
  const { user, res } = await adminGuard("messages");
  if (!user) return res;
  const body = await req.json().catch(() => null);
  const restaurantId = String(body?.restaurantId || "");
  if (!restaurantId) return fail("restaurantId kerak", 422);
  await prisma.supportMessage.updateMany({
    where: { restaurantId, isRead: false },
    data: { isRead: true },
  });
  return ok({ ok: true });
}
