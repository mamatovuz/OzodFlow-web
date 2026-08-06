import type { RuleInput } from "./schema";

/** RuleInput → Prisma create/nested-create ma'lumoti */
export function buildRuleData(restaurantId: string, input: RuleInput) {
  return {
    restaurantId,
    name: input.name,
    trigger: input.trigger,
    matchType: input.matchType,
    caseSensitive: input.caseSensitive,
    enabled: input.enabled,
    priority: input.priority,
    scope: input.scope,
    postId: input.postId ?? null,
    postCaption: input.postCaption ?? null,
    commentReply: input.commentReply ?? null,
    delaySec: input.delaySec,
    randomDelay: input.randomDelay,
    cooldownHours: input.cooldownHours,
    schedule: input.schedule ? JSON.stringify(input.schedule) : null,
    keywords: {
      create: input.keywords.map((k) => ({ word: k.word, isIgnore: k.isIgnore })),
    },
    messages: {
      create: input.messages.map((m) => ({
        step: m.step,
        kind: m.kind,
        body: m.body ?? null,
        mediaUrl: m.mediaUrl ?? null,
        delaySec: m.delaySec,
        buttons: {
          create: m.buttons.map((b, i) => ({
            label: b.label,
            actionType: b.actionType,
            actionUrl: b.actionUrl ?? null,
            nextStep: b.nextStep ?? null,
            payload: b.payload ?? null,
            sortOrder: b.sortOrder ?? i,
          })),
        },
      })),
    },
  };
}

type RuleWithRelations = {
  id: string;
  name: string;
  trigger: string;
  matchType: string;
  caseSensitive: boolean;
  enabled: boolean;
  priority: number;
  scope: string;
  postId: string | null;
  postCaption: string | null;
  commentReply: string | null;
  delaySec: number;
  randomDelay: boolean;
  cooldownHours: number;
  schedule: string | null;
  hitCount: number;
  createdAt: Date;
  keywords: { word: string; isIgnore: boolean }[];
  messages: {
    step: number;
    kind: string;
    body: string | null;
    mediaUrl: string | null;
    delaySec: number;
    buttons: {
      label: string;
      actionType: string;
      actionUrl: string | null;
      nextStep: number | null;
      payload: string | null;
      sortOrder: number;
    }[];
  }[];
  _count?: { logs: number };
};

export function serializeRule(r: RuleWithRelations) {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger,
    matchType: r.matchType,
    caseSensitive: r.caseSensitive,
    enabled: r.enabled,
    priority: r.priority,
    scope: r.scope,
    postId: r.postId,
    postCaption: r.postCaption,
    commentReply: r.commentReply,
    delaySec: r.delaySec,
    randomDelay: r.randomDelay,
    cooldownHours: r.cooldownHours,
    schedule: r.schedule ? safeParse(r.schedule) : null,
    hitCount: r.hitCount,
    createdAt: r.createdAt,
    logCount: r._count?.logs ?? 0,
    keywords: r.keywords.map((k) => ({ word: k.word, isIgnore: k.isIgnore })),
    messages: r.messages.map((m) => ({
      step: m.step,
      kind: m.kind,
      body: m.body,
      mediaUrl: m.mediaUrl,
      delaySec: m.delaySec,
      buttons: m.buttons.map((b) => ({
        label: b.label,
        actionType: b.actionType,
        actionUrl: b.actionUrl,
        nextStep: b.nextStep,
        payload: b.payload,
        sortOrder: b.sortOrder,
      })),
    })),
  };
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
