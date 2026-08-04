/**
 * Oddiy in-memory rate limiter (fixed window).
 *
 * Railway'da bitta instans (persistent Node process) bo'lgani uchun
 * module-darajadagi Map so'rovlar orasida saqlanadi va yetarli.
 * Kelajakda ko'p instansga o'tilsa — bu yerni Redis (Upstash) bilan
 * almashtirish kifoya, chaqiruvchi kod o'zgarmaydi.
 */
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return; // daqiqada bir marta tozalash
  lastSweep = now;
  for (const [key, b] of store) {
    if (b.resetAt <= now) store.delete(key);
  }
}

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: opts.limit - b.count, retryAfterSec: 0 };
}

/** So'rovdan mijoz IP manzilini ajratadi (proksi orqasida ham) */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Route boshida chaqiriladi. Limit oshsa 429 javob qaytaradi,
 * aks holda `null` (davom etish mumkin).
 *
 *   const limited = limitOrReject(req, "login", { limit: 10, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function limitOrReject(
  req: Request,
  name: string,
  opts: { limit: number; windowMs: number }
): NextResponse | null {
  const ip = clientIp(req);
  const r = rateLimit(`${name}:${ip}`, opts);
  if (r.ok) return null;
  return NextResponse.json(
    { success: false, error: "So'rovlar juda ko'p. Biroz kutib qayta urinib ko'ring." },
    { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } }
  );
}

/** Tez-tez ishlatiladigan oynalar */
export const WINDOW = {
  minute: 60_000,
  fiveMin: 5 * 60_000,
  hour: 60 * 60_000,
} as const;
