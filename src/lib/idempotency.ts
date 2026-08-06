/**
 * Oddiy in-memory idempotency saqlagichi.
 * Bir xil kalitli takroriy so'rov (masalan mijoz "Buyurtma" tugmasini ikki
 * marta bosdi) qisqa muddat ichida bloklanadi va oldingi natija qaytariladi.
 *
 * Railway'da bitta jarayon bo'lgani uchun Map yetarli. Ko'p instansda —
 * Redis bilan almashtiriladi.
 */
type Entry = { at: number; value: unknown };
const store = new Map<string, Entry>();
const TTL = 60_000; // 60 soniya

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, e] of store) if (now - e.at > TTL) store.delete(k);
}

/** Kalit bo'yicha saqlangan natijani qaytaradi (muddati o'tmagan bo'lsa). */
export function idempotentGet<T = unknown>(key: string): T | undefined {
  const now = Date.now();
  sweep(now);
  const e = store.get(key);
  if (!e) return undefined;
  if (now - e.at > TTL) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

/** Natijani kalit bilan saqlaydi. */
export function idempotentSet(key: string, value: unknown): void {
  store.set(key, { at: Date.now(), value });
}
