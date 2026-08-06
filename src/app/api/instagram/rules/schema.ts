import { z } from "zod";

export const buttonSchema = z.object({
  label: z.string().min(1).max(20), // Instagram tugma matni ≤ 20 belgi
  actionType: z.enum(["URL", "NEXT_STEP", "POSTBACK"]).default("URL"),
  actionUrl: z.string().url().optional().nullable(),
  nextStep: z.number().int().min(0).optional().nullable(),
  payload: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const messageSchema = z.object({
  step: z.number().int().min(0).default(0),
  kind: z.enum(["TEXT", "IMAGE", "VIDEO"]).default("TEXT"),
  body: z.string().max(2000).optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  delaySec: z.number().int().min(0).max(3600).default(0),
  buttons: z.array(buttonSchema).max(3).default([]), // Instagram: max 3 tugma
});

export const keywordSchema = z.object({
  word: z.string().min(1).max(80),
  isIgnore: z.boolean().default(false),
});

export const scheduleSchema = z
  .object({
    mode: z.enum(["ALWAYS", "HOURS", "WEEKEND", "CUSTOM"]).default("ALWAYS"),
    from: z.string().optional(),
    to: z.string().optional(),
    days: z.array(z.number().int().min(0).max(6)).optional(),
    tz: z.string().optional(),
  })
  .optional()
  .nullable();

export const ruleSchema = z.object({
  name: z.string().min(1).max(80),
  trigger: z.enum(["COMMENT", "DM", "COMMENT_DM"]).default("COMMENT_DM"),
  matchType: z.enum(["CONTAINS", "EQUALS", "STARTS_WITH", "ENDS_WITH"]).default("CONTAINS"),
  caseSensitive: z.boolean().default(false),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(99).default(1),
  scope: z.enum(["GLOBAL", "POST"]).default("GLOBAL"),
  postId: z.string().optional().nullable(),
  postCaption: z.string().optional().nullable(),
  commentReply: z.string().max(1000).optional().nullable(),
  delaySec: z.number().int().min(0).max(3600).default(0),
  randomDelay: z.boolean().default(false),
  cooldownHours: z.number().int().min(0).max(720).default(24),
  schedule: scheduleSchema,
  keywords: z.array(keywordSchema).default([]),
  messages: z.array(messageSchema).default([]),
});

export type RuleInput = z.infer<typeof ruleSchema>;
