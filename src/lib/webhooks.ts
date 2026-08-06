/**
 * Chiquvchi webhooklar — buyurtma hodisalarini restoranning o'z serveriga
 * yuboradi (masalan ularning Telegram-boti, CRM yoki yetkazib berish tizimi).
 *
 * Har yuborish HMAC-SHA256 imzo bilan boradi:
 *   X-OzodFlow-Signature: sha256=<hex>
 *   X-OzodFlow-Event: order.created
 * Qabul qiluvchi tomon shu imzoni `secret` bilan qayta hisoblab tekshiradi.
 *
 * Yetkazish "fire-and-forget" — buyurtma jarayonini HECH QACHON bloklamaydi.
 */
import crypto from "crypto";
import { prisma } from "./prisma";
import { log } from "./log";

export type WebhookEvent = "order.created" | "order.status";

export function signPayload(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Berilgan restoran uchun hodisага obuna bo'lgan barcha faol webhooklarga
 * yuboradi. Await qilinsa ham buyurtma oqimini to'xtatmaydi (xatolar yutiladi,
 * lekin log'ga yoziladi).
 */
export async function dispatchWebhook(
  restaurantId: string,
  event: WebhookEvent,
  data: unknown
): Promise<void> {
  let hooks;
  try {
    hooks = await prisma.webhook.findMany({
      where: { restaurantId, isActive: true },
    });
  } catch (err) {
    log.error("webhook_load_failed", { restaurantId, err: String(err) });
    return;
  }

  const targets = hooks.filter((h) => subscribed(h.events, event));
  if (targets.length === 0) return;

  const body = JSON.stringify({
    event,
    createdAt: new Date().toISOString(),
    data,
  });

  await Promise.all(
    targets.map(async (h) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OzodFlow-Event": event,
            "X-OzodFlow-Signature": signPayload(h.secret, body),
          },
          body,
          signal: controller.signal,
        });
        await prisma.webhook
          .update({
            where: { id: h.id },
            data: {
              lastStatus: res.status,
              lastError: res.ok ? null : `HTTP ${res.status}`,
              lastDeliveryAt: new Date(),
            },
          })
          .catch(() => {});
        if (!res.ok) log.warn("webhook_non_2xx", { id: h.id, status: res.status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn("webhook_delivery_failed", { id: h.id, err: msg });
        await prisma.webhook
          .update({
            where: { id: h.id },
            data: { lastError: msg, lastDeliveryAt: new Date() },
          })
          .catch(() => {});
      } finally {
        clearTimeout(timer);
      }
    })
  );
}

function subscribed(eventsJson: string, event: WebhookEvent): boolean {
  try {
    const arr = JSON.parse(eventsJson);
    return Array.isArray(arr) && arr.includes(event);
  } catch {
    return false;
  }
}
