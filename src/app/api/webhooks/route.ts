import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail, readJson, route } from "@/lib/api";

const EVENTS = ["order.created", "order.status"] as const;

// ─── Webhooklar ro'yxati ───
export const GET = route(async () => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return fail("Ruxsat yo'q", 403);

  const hooks = await prisma.webhook.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(hooks);
});

// ─── Yangi webhook (secret avtomatik yaratiladi) ───
const createSchema = z.object({
  url: z.string().url("URL noto'g'ri").startsWith("https://", "HTTPS bo'lishi kerak"),
  events: z.array(z.enum(EVENTS)).min(1).default(["order.created"]),
});

export const POST = route(async (req: Request) => {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant || restaurant.ownerId !== user.id) return fail("Ruxsat yo'q", 403);

  const { url, events } = await readJson(req, createSchema);
  const secret = "whsec_" + crypto.randomBytes(24).toString("base64url");

  const hook = await prisma.webhook.create({
    data: {
      restaurantId: restaurant.id,
      url,
      secret,
      events: JSON.stringify(events),
    },
  });
  return ok(hook, 201);
});
