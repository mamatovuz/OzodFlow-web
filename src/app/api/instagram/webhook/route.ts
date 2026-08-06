import { prisma } from "@/lib/prisma";
import { verifyChallenge, verifySignature, parseWebhook } from "@/lib/instagram/webhook";
import { processIncoming } from "@/lib/instagram/engine";
import type { IgIncoming } from "@/lib/instagram/types";

export const dynamic = "force-dynamic";
// Node runtime kerak (crypto, setTimeout bilan fon ishlov)
export const runtime = "nodejs";

// ─── Webhook tasdiqlash (Meta App sozlashda GET yuboradi) ───
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const challenge = verifyChallenge(sp);
  if (challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── Real-time hodisalar (comment / DM / tugma) ───
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");

  // Imzo tekshiruvi (app secret bilan) — soxta so'rovlarni rad etamiz
  if (!verifySignature(raw, sig)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const groups = parseWebhook(body);

  // Meta 5 soniyada 200 kutadi — hodisalarni saqlaymiz va FON'da ishlaymiz
  for (const group of groups) {
    for (const event of group.events) {
      void handleEvent(group.igUserId, event).catch(() => {});
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

/** Idempotentlik: bir hodisa faqat bir marta qayta ishlanadi */
async function handleEvent(igUserId: string, event: IgIncoming): Promise<void> {
  const eventKey =
    event.kind === "COMMENT"
      ? `c:${event.commentId}`
      : event.kind === "POSTBACK"
      ? `p:${event.messageId}`
      : `m:${event.messageId}`;

  try {
    await prisma.instagramEvent.create({
      data: {
        eventKey,
        type: event.kind === "COMMENT" ? "COMMENT" : "MESSAGE",
        igUserId,
        payload: JSON.stringify(event),
      },
    });
  } catch {
    // unique buzilsa — takroriy hodisa, e'tiborsiz qoldiramiz
    return;
  }

  await processIncoming(igUserId, event);
  await prisma.instagramEvent
    .updateMany({ where: { eventKey }, data: { processed: true } })
    .catch(() => {});
}
