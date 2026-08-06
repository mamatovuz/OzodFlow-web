/**
 * Oddiy structured logging + request-id.
 * Maqsad: xatolarni "jimgina yutish" o'rniga izlanadigan qilib yozish.
 * Kelajakda bu yerni Sentry/Logtail bilan almashtirish mumkin — chaqiruvchi
 * kod o'zgarmaydi.
 */
import { randomUUID } from "crypto";

type Level = "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = { t: new Date().toISOString(), level, msg, ...(meta || {}) };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};

export function newRequestId(): string {
  return randomUUID();
}
