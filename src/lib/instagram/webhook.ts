/**
 * Instagram Webhook: imzo tekshiruvi va hodisalarni normallashtirish.
 * Instagram real-time hodisalarni (polling emas) X-Hub-Signature-256 imzo bilan yuboradi.
 */
import crypto from "crypto";
import { getIgConfig } from "./config";
import type { IgIncoming } from "./types";

/** X-Hub-Signature-256 HMAC imzosini tekshiradi (app secret bilan) */
export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const cfg = getIgConfig();
  if (!cfg.appSecret) return false;
  if (!signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", cfg.appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** GET verify challenge (webhook sozlashda Meta yuboradi) */
export function verifyChallenge(params: URLSearchParams): string | null {
  const cfg = getIgConfig();
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token && token === cfg.verifyToken) {
    return challenge;
  }
  return null;
}

/**
 * Instagram webhook payload'ini normallashtirilgan hodisalarga aylantiradi.
 * Struktura: { object:"instagram", entry:[{ id, changes:[...], messaging:[...] }] }
 */
export function parseWebhook(body: any): { igUserId: string; events: IgIncoming[] }[] {
  const out: { igUserId: string; events: IgIncoming[] }[] = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const igUserId = String(entry?.id ?? "");
    const events: IgIncoming[] = [];

    // 1) Commentlar — changes[].field === "comments"
    for (const change of entry?.changes || []) {
      if (change?.field === "comments" && change?.value) {
        const v = change.value;
        // O'z akkauntimiz yozgan javoblarni e'tiborsiz qoldiramiz
        const fromId = String(v?.from?.id ?? "");
        if (fromId && fromId === igUserId) continue;
        events.push({
          kind: "COMMENT",
          commentId: String(v?.id ?? ""),
          mediaId: String(v?.media?.id ?? ""),
          text: String(v?.text ?? ""),
          fromId,
          fromUsername: v?.from?.username,
        });
      }
    }

    // 2) DM'lar — messaging[]
    for (const m of entry?.messaging || []) {
      const senderId = String(m?.sender?.id ?? "");
      // echo (o'zimiz yuborgan) xabarlarni tashlab yuboramiz
      if (m?.message?.is_echo) continue;
      if (senderId && senderId === igUserId) continue;
      // Tugma bosilishi (postback / quick reply)
      const postbackPayload = m?.postback?.payload || m?.message?.quick_reply?.payload;
      if (postbackPayload) {
        events.push({
          kind: "POSTBACK",
          messageId: String(m?.postback?.mid ?? m?.message?.mid ?? crypto.randomUUID()),
          payload: String(postbackPayload),
          senderId,
        });
        continue;
      }
      const text = m?.message?.text;
      if (text) {
        events.push({
          kind: "DM",
          messageId: String(m?.message?.mid ?? ""),
          text: String(text),
          senderId,
        });
      }
    }

    if (events.length) out.push({ igUserId, events });
  }

  return out;
}
