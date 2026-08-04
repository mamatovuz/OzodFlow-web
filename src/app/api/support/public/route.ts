import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { sendTelegramMessage } from "@/lib/telegram";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

// Bloklangan menyu sahifasidan tashrifchi bosh adminga xabar yuboradi
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "support-public", { limit: 5, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug || "").trim();
  const text = String(body?.body || "").trim();
  const contact = String(body?.contact || "").trim().slice(0, 200);
  if (!slug || !text) return fail("Ma'lumot to'liq emas", 422);
  if (text.length > 2000) return fail("Xabar juda uzun", 422);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, isBlocked: true },
  });
  if (!restaurant) return fail("Restoran topilmadi", 404);

  await prisma.supportMessage.create({
    data: {
      restaurantId: restaurant.id,
      topic: "CONTACT",
      sender: "VISITOR",
      body: text,
      contact: contact || null,
    },
  });

  await sendTelegramMessage(
    `📨 Bloklangan menyu sahifasidan aloqa\n<b>${restaurant.name}</b> (/m/${restaurant.slug})\n${contact ? `Aloqa: ${contact}\n` : ""}\n${text}`
  ).catch(() => {});

  return ok({ sent: true }, 201);
}
