/**
 * RATE LIMITING — bir xil manbadan kelayotgan so'rovlarni cheklash.
 *
 * Sliding window: oxirgi `windowMs` ichidagi urinishlar sanaladi.
 * Fixed window'dan farqi muhim — fixed window chegarasida hujumchi
 * limitdan ikki barobar ko'p so'rov yuborishi mumkin (oyna oxirida N ta,
 * yangi oyna boshida yana N ta).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CHEKLOV: hisob XOTIRADA yuritiladi.
 *
 *  Bu bitta server instansiyasi uchun ishlaydi. Bir nechta instansiya
 *  bo'lsa (horizontal scaling) har biri o'z hisobini yuritadi va amaldagi
 *  limit instansiya soniga ko'payadi.
 *
 *  Redis qo'shilganda `REDIS_URL` orqali almashtiriladi — interfeys
 *  o'zgarmaydi. Hozircha bitta instansiya uchun bu yetarli va tashqi
 *  bog'liqlik talab qilmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

type Bucket = {
  /** Urinishlar vaqtlari (ms). Oynadan chiqqanlari tozalanadi. */
  hits: number[];
  /** Limitdan oshgandan keyin bloklash tugash vaqti */
  blockedUntil?: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Xotira cheksiz o'smasligi kerak. Har tozalashda eskirgan kalitlar
 * o'chiriladi.
 *
 * Nega `setInterval` emas: serverless/Edge muhitida interval jarayonni
 * tirik ushlab turadi. Buning o'rniga har chaqiruvda ehtimol bilan
 * tozalaymiz — arzon va ishonchli.
 */
const CLEANUP_PROBABILITY = 0.01;
const MAX_BUCKETS = 10_000;

function maybeCleanup(now: number): void {
  if (buckets.size < MAX_BUCKETS && Math.random() > CLEANUP_PROBABILITY) return;

  for (const [key, bucket] of buckets) {
    const lastHit = bucket.hits[bucket.hits.length - 1] ?? 0;
    const stillBlocked = bucket.blockedUntil && bucket.blockedUntil > now;

    // Bir soatdan beri tegilmagan va bloklanmagan kalitlarni o'chiramiz.
    if (!stillBlocked && now - lastHit > 3_600_000) {
      buckets.delete(key);
    }
  }
}

export type RateLimitRule = {
  /** Oyna uzunligi (ms) */
  windowMs: number;
  /** Oyna ichida ruxsat etilgan maksimal urinish */
  max: number;
  /**
   * Limitdan oshgandan keyin qancha vaqt bloklanadi (ms).
   * Berilmasa oynaning o'zi bloklash muddati bo'ladi.
   */
  blockMs?: number;
};

export type RateLimitResult = {
  ok: boolean;
  /** Qolgan urinishlar soni */
  remaining: number;
  /** Qayta urinish mumkin bo'ladigan vaqtgacha sekund */
  retryAfterSeconds: number;
};

/**
 * Limitni tekshiradi VA urinishni hisobga oladi.
 *
 * DIQQAT: bu funksiya chaqirilishining o'zi urinish sanaladi. Faqat
 * tekshirish kerak bo'lsa `peek` ishlatiladi.
 */
export function consume(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Blokdami?
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  // Oynadan chiqqan urinishlarni olib tashlaymiz.
  const windowStart = now - rule.windowMs;
  bucket.hits = bucket.hits.filter((time) => time > windowStart);

  if (bucket.hits.length >= rule.max) {
    bucket.blockedUntil = now + (rule.blockMs ?? rule.windowMs);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  bucket.hits.push(now);
  bucket.blockedUntil = undefined;

  return {
    ok: true,
    remaining: rule.max - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/** Urinishni hisoblamasdan holatni ko'radi. */
export function peek(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) return { ok: true, remaining: rule.max, retryAfterSeconds: 0 };

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  const hits = bucket.hits.filter((time) => time > now - rule.windowMs).length;
  return {
    ok: hits < rule.max,
    remaining: Math.max(0, rule.max - hits),
    retryAfterSeconds: 0,
  };
}

/** Muvaffaqiyatli amaldan keyin hisobni tozalash (masalan to'g'ri kirish). */
export function reset(key: string): void {
  buckets.delete(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tayyor qoidalar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Qoidalar ataylab har xil qattiqlikda:
 *
 *  • LOGIN — eng qattiq. Parolni taxmin qilish urinishlarini to'xtatadi.
 *  • OTP_REQUEST — SMS/email yuborish PUL turadi, shuning uchun qattiq.
 *  • OTP_VERIFY — kodni taxmin qilish (6 raqam = 1 mln variant).
 *  • REGISTER — spam hisoblar yaratishga qarshi.
 *  • WRITE — umumiy yozish amallari (loyiha yaratish, xabar yuborish).
 */
export const RULES = {
  LOGIN: { windowMs: 15 * 60_000, max: 8, blockMs: 30 * 60_000 },
  REGISTER: { windowMs: 60 * 60_000, max: 5, blockMs: 60 * 60_000 },
  OTP_REQUEST: { windowMs: 15 * 60_000, max: 3, blockMs: 30 * 60_000 },
  OTP_VERIFY: { windowMs: 15 * 60_000, max: 6, blockMs: 30 * 60_000 },
  PASSWORD_RESET: { windowMs: 60 * 60_000, max: 4, blockMs: 60 * 60_000 },
  WRITE: { windowMs: 60_000, max: 30 },
  /** Ommaviy forma (aloqa, support) — bot spamiga qarshi */
  PUBLIC_FORM: { windowMs: 10 * 60_000, max: 5, blockMs: 20 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Limit kalitini yasaydi.
 *
 * IP VA identifikator birga ishlatiladi: faqat IP bo'lsa umumiy Wi-Fi
 * ortidagi hamma zarar ko'radi, faqat email bo'lsa hujumchi har urinishda
 * boshqa email yozib aylanib o'tadi.
 */
export function rateLimitKey(
  action: string,
  parts: { ip?: string | null; identifier?: string | null }
): string {
  const ip = parts.ip || "noip";
  const identifier = (parts.identifier || "noid").toLowerCase();
  return `${action}:${ip}:${identifier}`;
}

/** Foydalanuvchiga ko'rsatiladigan xabar. */
export function rateLimitMessage(result: RateLimitResult): string {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);

  if (minutes <= 1) {
    return "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring.";
  }

  return `Juda ko'p urinish. ${minutes} daqiqadan keyin qayta urinib ko'ring.`;
}
