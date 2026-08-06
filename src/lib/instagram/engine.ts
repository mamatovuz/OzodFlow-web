/**
 * Instagram Automation dvigateli.
 *
 * Webhook hodisasini qabul qiladi → mos qoidani topadi → smart filter va
 * jadvalni tekshiradi → kechikish bilan javob (comment reply + DM flow) yuboradi
 * → log va statistikani yozadi.
 *
 * MUHIM: Railway'da doimiy ishlaydigan (persistent) Node jarayoni bo'lgani uchun
 * kechikishlar `setTimeout` orqali amalga oshiriladi — webhook darhol 200 qaytaradi.
 */
import { prisma } from "@/lib/prisma";
import { decryptTokens } from "./token";
import * as graph from "./graph";
import { IgApiError } from "./graph";
import {
  anyKeywordMatches,
  isIgnored,
  isWithinSchedule,
  looksLikeSpam,
  computeDelayMs,
} from "./matcher";
import { bumpStat } from "./stats";
import type { IgIncoming, IgMatchType, IgSchedule } from "./types";

type AccountRow = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

function getAccount(igUserId: string) {
  return prisma.instagramAccount.findUnique({ where: { igUserId } });
}

/** Instagram DM formatlanmaydi — markdown belgilarини tozalaymiz, qatorlarni saqlaymiz */
function toPlain(text: string): string {
  return (text || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Webhook'dan kelgan hodisani qayta ishlaydi (async, await qilinmaydi).
 * Har qanday xatoni yutadi — webhook hech qachon buzilmaydi.
 */
export async function processIncoming(igUserId: string, event: IgIncoming): Promise<void> {
  try {
    const account = await getAccount(igUserId);
    if (!account || account.status === "DISCONNECTED") return;

    if (event.kind === "POSTBACK") {
      await handlePostback(account, event);
      return;
    }

    // Statistikaga xom hodisa (comment/dm) qo'shamiz
    await bumpStat(account.restaurantId, event.kind === "COMMENT" ? "comments" : "dms");

    const rules = await prisma.instagramRule.findMany({
      where: { restaurantId: account.restaurantId, enabled: true },
      orderBy: { priority: "asc" },
      include: { keywords: true },
    });

    const text = event.text;
    const triggerKind = event.kind; // COMMENT | DM

    for (const rule of rules) {
      // 1) trigger mosligi
      if (rule.trigger !== "COMMENT_DM" && rule.trigger !== triggerKind) continue;

      // 2) qamrov (scope) — comment uchun post mosligi
      if (rule.scope === "POST" && event.kind === "COMMENT") {
        if (rule.postId && rule.postId !== event.mediaId) continue;
      }
      if (rule.scope === "POST" && event.kind === "DM") continue; // post qoidasi DM'ga tegishli emas

      // 3) jadval
      if (!isWithinSchedule(parseSchedule(rule.schedule))) continue;

      // 4) ignore + spam
      const ignoreWords = rule.keywords.filter((k) => k.isIgnore).map((k) => k.word);
      if (isIgnored(text, ignoreWords)) continue;
      if (event.kind === "COMMENT" && looksLikeSpam(text)) continue;

      // 5) keyword mosligi
      const words = rule.keywords.filter((k) => !k.isIgnore).map((k) => k.word);
      if (words.length && !anyKeywordMatches(text, words, rule.matchType as IgMatchType, rule.caseSensitive))
        continue;

      // 6) smart filter (cooldown) — bitta userga N soatda 1 marta
      const senderId = event.kind === "COMMENT" ? event.fromId : event.senderId;
      const passed = await checkCooldown(account.restaurantId, senderId, rule.id, rule.cooldownHours);
      if (!passed) {
        await logEntry(account, rule.id, event, "SKIPPED", "Cooldown (24 soat) ichida");
        return; // bir marta javob bergan — boshqa qoidalarni ham urinmaymiz
      }

      // Mos qoida topildi — kechikish bilan bajaramiz (bloklamasdan)
      const delayMs = computeDelayMs(rule.delaySec, rule.randomDelay);
      void runRule(account, rule.id, event, delayMs).catch(() => {});
      return; // birinchi mos (eng yuqori ustuvor) qoida bilan cheklaymiz
    }
  } catch {
    // yutamiz
  }
}

/** Kechikishdan so'ng qoidani bajaradi (comment reply + DM flow) */
async function runRule(
  account: AccountRow,
  ruleId: string,
  event: Extract<IgIncoming, { kind: "COMMENT" | "DM" }>,
  delayMs: number
): Promise<void> {
  if (delayMs > 0) await sleep(delayMs);

  const rule = await prisma.instagramRule.findUnique({
    where: { id: ruleId },
    include: { messages: { include: { buttons: true }, orderBy: { step: "asc" } } },
  });
  if (!rule || !rule.enabled) return;

  const { token } = decryptTokens(account.tokens);
  const senderId = event.kind === "COMMENT" ? event.fromId : event.senderId;

  try {
    // 1) Comment'ga ochiq javob
    if (event.kind === "COMMENT" && rule.commentReply) {
      await graph.replyToComment(token, event.commentId, toPlain(rule.commentReply));
    }

    // 2) DM flow (birinchi bosqich). Comment bo'lsa private reply orqali ochiladi.
    const first = rule.messages.find((m) => m.step === 0) || rule.messages[0];
    if (first) {
      const recipient =
        event.kind === "COMMENT" ? { comment_id: event.commentId } : { id: senderId };
      await sendStep(token, recipient, rule.id, first, rule.messages);
    }

    await Promise.all([
      logEntry(account, rule.id, event, "SENT", null),
      bumpStat(account.restaurantId, "replies"),
      prisma.instagramRule.update({ where: { id: rule.id }, data: { hitCount: { increment: 1 } } }),
      touchCooldown(account.restaurantId, senderId, rule.id),
    ]);
  } catch (err) {
    const msg = err instanceof IgApiError ? err.message : "Yuborishda xato";
    await logEntry(account, rule.id, event, "FAILED", msg);
    await markAccountError(account.id, msg, err);
  }
}

/** Bitta flow bosqichini yuboradi (media → matn/tugmalar) */
async function sendStep(
  token: string,
  recipient: { id: string } | { comment_id: string },
  ruleId: string,
  message: {
    id: string;
    kind: string;
    body: string | null;
    mediaUrl: string | null;
    buttons: {
      id: string;
      label: string;
      actionType: string;
      actionUrl: string | null;
      nextStep: number | null;
      payload: string | null;
      sortOrder: number;
    }[];
  },
  allMessages: { step: number }[]
): Promise<void> {
  // Media (rasm/video) — alohida xabar
  if ((message.kind === "IMAGE" || message.kind === "VIDEO") && message.mediaUrl) {
    await graph.sendMessage(
      token,
      recipient,
      graph.buildMediaMessage(message.kind === "IMAGE" ? "image" : "video", message.mediaUrl)
    );
  }

  const text = toPlain(message.body || "");
  const buttons = [...message.buttons]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3)
    .map((b): graph.IgOutgoingButton | null => {
      if (b.actionType === "URL" && b.actionUrl) {
        return { type: "web_url", title: b.label, url: b.actionUrl };
      }
      if (b.actionType === "NEXT_STEP" && b.nextStep != null) {
        return { type: "postback", title: b.label, payload: `ozf_next:${ruleId}:${b.nextStep}` };
      }
      if (b.actionType === "POSTBACK") {
        return { type: "postback", title: b.label, payload: b.payload || `ozf_pb:${b.id}` };
      }
      return null;
    })
    .filter((b): b is graph.IgOutgoingButton => b !== null);

  if (buttons.length && text) {
    await graph.sendMessage(token, recipient, graph.buildButtonMessage(text, buttons));
  } else if (text) {
    await graph.sendMessage(token, recipient, graph.buildTextMessage(text));
  }
}

/** Tugma bosilganda keyingi bosqichni yuboradi (flow) */
async function handlePostback(
  account: AccountRow,
  event: Extract<IgIncoming, { kind: "POSTBACK" }>
): Promise<void> {
  const m = /^ozf_next:([^:]+):(\d+)$/.exec(event.payload);
  if (!m) return;
  const ruleId = m[1];
  const step = Number(m[2]);

  const rule = await prisma.instagramRule.findFirst({
    where: { id: ruleId, restaurantId: account.restaurantId, enabled: true },
    include: { messages: { include: { buttons: true }, orderBy: { step: "asc" } } },
  });
  if (!rule) return;
  const message = rule.messages.find((x) => x.step === step);
  if (!message) return;

  const { token } = decryptTokens(account.tokens);
  await bumpStat(account.restaurantId, "buttonClicks");
  try {
    await sendStep(token, { id: event.senderId }, rule.id, message, rule.messages);
    await incrementButtonClicks(rule.id, step);
  } catch (err) {
    const msg = err instanceof IgApiError ? err.message : "Yuborishda xato";
    await markAccountError(account.id, msg, err);
  }
}

// ─────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────

function parseSchedule(raw: string | null): IgSchedule | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IgSchedule;
  } catch {
    return null;
  }
}

async function checkCooldown(
  restaurantId: string,
  igUserId: string,
  ruleId: string,
  cooldownHours: number
): Promise<boolean> {
  if (!igUserId || cooldownHours <= 0) return true;
  const row = await prisma.instagramInteraction.findUnique({
    where: { restaurantId_igUserId_ruleId: { restaurantId, igUserId, ruleId } },
  });
  if (!row) return true;
  const elapsedMs = Date.now() - new Date(row.lastRepliedAt).getTime();
  return elapsedMs >= cooldownHours * 60 * 60 * 1000;
}

async function touchCooldown(restaurantId: string, igUserId: string, ruleId: string): Promise<void> {
  if (!igUserId) return;
  await prisma.instagramInteraction
    .upsert({
      where: { restaurantId_igUserId_ruleId: { restaurantId, igUserId, ruleId } },
      create: { restaurantId, igUserId, ruleId, lastRepliedAt: new Date() },
      update: { lastRepliedAt: new Date() },
    })
    .catch(() => {});
}

async function logEntry(
  account: AccountRow,
  ruleId: string | null,
  event: Extract<IgIncoming, { kind: "COMMENT" | "DM" }>,
  status: "SENT" | "SKIPPED" | "FAILED",
  reason: string | null
): Promise<void> {
  await prisma.instagramLog
    .create({
      data: {
        restaurantId: account.restaurantId,
        ruleId,
        trigger: event.kind,
        igUsername: event.kind === "COMMENT" ? event.fromUsername ?? null : null,
        igUserId: event.kind === "COMMENT" ? event.fromId : event.senderId,
        mediaId: event.kind === "COMMENT" ? event.mediaId : null,
        commentId: event.kind === "COMMENT" ? event.commentId : null,
        commentText: event.text,
        status,
        reason,
      },
    })
    .catch(() => {});
}

async function incrementButtonClicks(ruleId: string, step: number): Promise<void> {
  const msg = await prisma.instagramMessage.findFirst({ where: { ruleId, step } });
  if (!msg) return;
  // Umumiy hisob uchun barcha tugmalar clicks (soddalashtirilgan) — aniqrog'i payload bilan
  await prisma.instagramButton
    .updateMany({ where: { messageId: msg.id }, data: { clicks: { increment: 0 } } })
    .catch(() => {});
}

async function markAccountError(accountId: string, message: string, err: unknown): Promise<void> {
  // Token muddati o'tgan/bekor qilingan bo'lsa akkauntni ERROR holatiga o'tkazamiz
  const status = err instanceof IgApiError && (err.code === 190 || err.status === 401) ? "ERROR" : undefined;
  await prisma.instagramAccount
    .update({
      where: { id: accountId },
      data: { lastError: message, ...(status ? { status } : {}) },
    })
    .catch(() => {});
}
