/**
 * PUL BILAN ISHLASH — yagona ruxsat etilgan joy.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QOIDALAR
 *
 *  1. Barcha summalar `bigint`, birlik — TIYIN (1 so'm = 100 tiyin).
 *     `number` yoki `Float` bilan pul hisoblanmaydi. Hech qachon.
 *
 *  2. Foizlar `number`, birlik — BASIS POINT (bps). 100 bps = 1%.
 *     Sabab: 15% ni Float bilan ko'paytirsa 0.15 * 3 = 0.44999... bo'ladi.
 *
 *  3. Bo'lishda QOLDIQ YO'QOLMASLIGI kerak. Barcha `split*` funksiyalari
 *     natijalarining yig'indisi kiritilgan summaga AYNAN teng bo'lishini
 *     kafolatlaydi (biri floor, ikkinchisi ayirma orqali hisoblanadi).
 *
 *  4. Formatlash `Intl` ISHLATMAYDI. Sabab: Node ICU va brauzer ICU turli
 *     ajratgich berishi mumkin (oddiy probel vs uzilmas probel), bu Next.js
 *     SSR'da hydration xatosini keltiradi. Qo'lda yozilgan formatter server
 *     va klientda bir xil natija beradi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Pul miqdori, tiyinda. Hujjat uchun alias — bu `bigint`. */
export type Tiyin = bigint;

export const TIYIN_PER_SUM = 100n;

/** Basis point asosi: 10 000 bps = 100%. */
export const BPS_BASE = 10_000;

/**
 * Bitta tranzaksiya uchun aql bovar qiladigan yuqori chegara: 10 mlrd so'm.
 * Bu texnik limit emas (bigint cheksiz), balki xato kiritishdan himoya —
 * kimdir 1000000000000 yozib qo'yganini ushlash uchun.
 */
export const MAX_AMOUNT_SUM = 10_000_000_000;
export const MAX_AMOUNT_TIYIN = BigInt(MAX_AMOUNT_SUM) * TIYIN_PER_SUM;

/** Uzilmas probel — raqam o'rtasidan qatorga bo'linib ketmasligi uchun. */
const NBSP = "\u00A0";

// ─────────────────────────────────────────────────────────────────────────────
// Aylantirish
// ─────────────────────────────────────────────────────────────────────────────

/**
 * So'mni tiyinga aylantiradi. Kasr qismi 2 xonagacha hisobga olinadi,
 * undan ortig'i kesiladi (yaxlitlanmaydi — mijoz foydasiga).
 *
 *   sumToTiyin(1500)     → 150000n
 *   sumToTiyin("1500.5") → 150050n
 */
export function sumToTiyin(sum: number | string): Tiyin {
  const text = typeof sum === "number" ? sum.toString() : sum.trim();

  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Pul qiymati noto'g'ri formatda: ${JSON.stringify(sum)}`);
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart = "0", fractionPart = ""] = unsigned.split(".");

  // Kasr qismini aynan 2 xonaga keltirish: "5" → "50", "567" → "56"
  const fraction = fractionPart.padEnd(2, "0").slice(0, 2);
  const total = BigInt(wholePart) * TIYIN_PER_SUM + BigInt(fraction);

  return negative ? -total : total;
}

/**
 * Tiyinni so'mga aylantiradi. FAQAT ko'rsatish uchun — natija `number`,
 * ya'ni bu qiymat bilan keyingi hisob-kitob QILINMAYDI.
 */
export function tiyinToSum(amount: Tiyin): number {
  return Number(amount) / Number(TIYIN_PER_SUM);
}

/**
 * Foydalanuvchi kiritgan matnni tiyinga aylantiradi. Probel, uzilmas probel,
 * vergul va apostrof ajratgichlarni tushunadi; vergul kasr ajratgichi
 * sifatida ham ishlaydi ("1500,50").
 *
 * Noto'g'ri kiritishda `null` qaytaradi — chunki bu foydalanuvchi xatosi,
 * exception emas.
 */
export function parseMoneyInput(input: string): Tiyin | null {
  let text = input.trim();
  if (!text) return null;

  // Guruh ajratgichlarni olib tashlash. JavaScript'da `\s` Unicode probellarni
  // ham qamrab oladi (U+00A0 uzilmas, U+202F ingichka), shuning uchun ularni
  // alohida sanab o'tish shart emas. `'` — shveycha uslubdagi ajratgich.
  text = text.replace(/[\s']/g, "");

  // "1500,50" → "1500.50"  (oxirgi vergul kasr ajratgichi bo'lsa)
  const lastComma = text.lastIndexOf(",");
  if (lastComma !== -1) {
    const afterComma = text.length - lastComma - 1;
    text =
      afterComma <= 2
        ? `${text.slice(0, lastComma)}.${text.slice(lastComma + 1)}`
        : text.replace(/,/g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;

  try {
    const amount = sumToTiyin(text);
    if (amount > MAX_AMOUNT_TIYIN || amount < -MAX_AMOUNT_TIYIN) return null;
    return amount;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatlash
// ─────────────────────────────────────────────────────────────────────────────

/** Butun sonni 3 xonalab guruhlaydi: 1234567 → "1 234 567" */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export type FormatMoneyOptions = {
  /** "so'm" qo'shilsinmi. Standart: true */
  currency?: boolean;
  /** Tiyinlar ko'rsatilsinmi. Standart: faqat noldan farqli bo'lsa */
  showTiyin?: boolean | "auto";
  /** Musbat summa oldiga "+" qo'yilsinmi (tranzaksiya ro'yxati uchun) */
  signed?: boolean;
};

/**
 * Pul summasini o'zbekcha formatda yozadi.
 *
 *   formatMoney(150000000n)                    → "1 500 000 so'm"
 *   formatMoney(150050n)                       → "1 500,50 so'm"
 *   formatMoney(150000n, { currency: false })  → "1 500"
 *   formatMoney(150000n, { signed: true })     → "+1 500 so'm"
 */
export function formatMoney(amount: Tiyin, options: FormatMoneyOptions = {}): string {
  const { currency = true, showTiyin = "auto", signed = false } = options;

  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;

  const whole = absolute / TIYIN_PER_SUM;
  const tiyin = absolute % TIYIN_PER_SUM;

  const includeTiyin = showTiyin === "auto" ? tiyin !== 0n : showTiyin;

  let text = groupDigits(whole.toString());
  if (includeTiyin) {
    text += `,${tiyin.toString().padStart(2, "0")}`;
  }

  const sign = negative ? "−" : signed ? "+" : "";
  return currency ? `${sign}${text}${NBSP}so'm` : `${sign}${text}`;
}

/**
 * Qisqa format — kartochka va statistika uchun.
 *
 *   formatMoneyCompact(150000000n)      → "1,5 mln so'm"
 *   formatMoneyCompact(45000000000n)    → "450 mln so'm"
 *   formatMoneyCompact(1200000000000n)  → "12 mlrd so'm"
 */
export function formatMoneyCompact(amount: Tiyin, withCurrency = true): string {
  const negative = amount < 0n;
  const sum = (negative ? -amount : amount) / TIYIN_PER_SUM;

  const units: Array<{ limit: bigint; divisor: bigint; suffix: string }> = [
    { limit: 1_000_000_000_000n, divisor: 1_000_000_000_000n, suffix: "trln" },
    { limit: 1_000_000_000n, divisor: 1_000_000_000n, suffix: "mlrd" },
    { limit: 1_000_000n, divisor: 1_000_000n, suffix: "mln" },
    // "ming" faqat 10 000 so'mdan boshlab — "1,5 ming so'm" o'qishga noqulay,
    // bunday summalar to'liq ko'rsatilsa tushunarli bo'ladi.
    { limit: 10_000n, divisor: 1_000n, suffix: "ming" },
  ];

  let text: string;
  const unit = units.find((candidate) => sum >= candidate.limit);

  if (unit) {
    const whole = sum / unit.divisor;
    // Bir kasr xona — faqat kichik sonlarda ma'noli ("1,5 mln", lekin "450 mln")
    const decimal = whole < 100n ? ((sum * 10n) / unit.divisor) % 10n : 0n;
    // Birlik oldida ham uzilmas probel — "1,5" va "mln" ajralib qolmasligi kerak.
    text =
      decimal > 0n
        ? `${groupDigits(whole.toString())},${decimal}${NBSP}${unit.suffix}`
        : `${groupDigits(whole.toString())}${NBSP}${unit.suffix}`;
  } else {
    text = groupDigits(sum.toString());
  }

  const sign = negative ? "−" : "";
  return withCurrency ? `${sign}${text}${NBSP}so'm` : `${sign}${text}`;
}

/** Byudjet oralig'i: "1 500 000 – 3 000 000 so'm" */
export function formatMoneyRange(min: Tiyin, max: Tiyin): string {
  if (min === max) return formatMoney(min);
  return `${formatMoney(min, { currency: false })}${NBSP}–${NBSP}${formatMoney(max)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Foiz (basis point)
// ─────────────────────────────────────────────────────────────────────────────

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** "15%" yoki "12,5%" */
export function formatBps(bps: number): string {
  const percent = bpsToPercent(bps);

  if (Number.isInteger(percent)) return `${percent}%`;

  // 12,5% ko'rinishi kerak, 12,50% emas — keraksiz nollar olib tashlanadi.
  const text = percent
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",");

  return `${text}%`;
}

/**
 * Summadan bps ulushini oladi, PASTGA yaxlitlab (floor).
 * Aynan floor — chunki `splitCommission` qoldiqni ayirma orqali beradi
 * va shu tarzda yig'indi hech qachon buzilmaydi.
 */
export function applyBps(amount: Tiyin, bps: number): Tiyin {
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_BASE) {
    throw new Error(`bps 0..${BPS_BASE} oralig'ida butun son bo'lishi kerak, keldi: ${bps}`);
  }
  if (amount < 0n) {
    throw new Error("applyBps manfiy summa bilan ishlamaydi");
  }
  return (amount * BigInt(bps)) / BigInt(BPS_BASE);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bo'lish — yig'indi aniq saqlanadi
// ─────────────────────────────────────────────────────────────────────────────

export type CommissionSplit = {
  /** Umumiy summa (o'zgarmaydi) */
  total: Tiyin;
  /** Platforma ushlab qoladigan qism */
  commission: Tiyin;
  /** Developer oladigan qism */
  net: Tiyin;
  commissionBps: number;
};

/**
 * Escrow summasini platforma komissiyasi va developer ulushiga bo'ladi.
 *
 * KAFOLAT: `commission + net === total` — har doim, istalgan qiymatlarda.
 * Komissiya pastga yaxlitlanadi, tiyin qoldig'i developerga qoladi.
 *
 *   splitCommission(100_000_00n, 1500) → commission 150 000, net 850 000 tiyin
 */
export function splitCommission(total: Tiyin, commissionBps: number): CommissionSplit {
  if (total < 0n) {
    throw new Error("Escrow summasi manfiy bo'lishi mumkin emas");
  }

  const commission = applyBps(total, commissionBps);
  const net = total - commission;

  // Himoya: mantiq buzilsa ovozsiz o'tib ketmasin
  if (commission + net !== total) {
    throw new Error(`Komissiya bo'linishi buzildi: ${commission} + ${net} !== ${total}`);
  }

  return { total, commission, net, commissionBps };
}

export type DisputeSplit = {
  total: Tiyin;
  customerAmount: Tiyin;
  developerAmount: Tiyin;
};

/**
 * Nizo yechimida summani mijoz va developer orasida bo'ladi.
 * KAFOLAT: `customerAmount + developerAmount === total`.
 */
export function splitByShare(total: Tiyin, customerShareBps: number): DisputeSplit {
  const customerAmount = applyBps(total, customerShareBps);
  const developerAmount = total - customerAmount;

  if (customerAmount + developerAmount !== total) {
    throw new Error(`Nizo bo'linishi buzildi: ${customerAmount} + ${developerAmount} !== ${total}`);
  }

  return { total, customerAmount, developerAmount };
}

/**
 * Summani N ta bosqichga teng bo'ladi. Qoldiq birinchi bosqichlarga
 * bir tiyinlab taqsimlanadi, shunda yig'indi aynen to'g'ri chiqadi.
 *
 *   splitEvenly(1000n, 3) → [334n, 333n, 333n]
 */
export function splitEvenly(total: Tiyin, parts: number): Tiyin[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new Error(`Bo'laklar soni 1 dan kichik bo'lmasin: ${parts}`);
  }

  const divisor = BigInt(parts);
  const base = total / divisor;
  const remainder = Number(total % divisor);

  return Array.from({ length: parts }, (_unused, index) =>
    index < remainder ? base + 1n : base
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tekshirish va serializatsiya
// ─────────────────────────────────────────────────────────────────────────────

/** Summa musbat va chegarada ekanini tekshiradi. Xato bo'lsa sabab qaytaradi. */
export function validateAmount(
  amount: Tiyin,
  options: { min?: Tiyin; max?: Tiyin; allowZero?: boolean } = {}
): { ok: true } | { ok: false; reason: string } {
  const { min = 0n, max = MAX_AMOUNT_TIYIN, allowZero = false } = options;

  if (amount < 0n) return { ok: false, reason: "Summa manfiy bo'lishi mumkin emas" };
  if (!allowZero && amount === 0n) return { ok: false, reason: "Summa noldan katta bo'lishi kerak" };
  if (amount < min) {
    return { ok: false, reason: `Minimal summa ${formatMoney(min)}` };
  }
  if (amount > max) {
    return { ok: false, reason: `Maksimal summa ${formatMoney(max)}` };
  }

  return { ok: true };
}

/**
 * `bigint` ni JSON'ga uzatish uchun matnga aylantiradi.
 *
 * `JSON.stringify` bigint bilan xato beradi, shuning uchun API javob
 * qaytarishdan oldin barcha pul maydonlari shu funksiyadan o'tadi.
 * Global `BigInt.prototype.toJSON` qo'shish ATAYLAB qilinmagan — u butun
 * ilovaga ta'sir qiladigan yashirin xatti-harakat bo'lardi.
 */
export function serializeAmount(amount: Tiyin): string {
  return amount.toString();
}

/** API'dan kelgan matnli summani qaytarib `bigint` ga aylantiradi. */
export function deserializeAmount(value: string | number | bigint): Tiyin {
  return BigInt(value);
}

/**
 * Pul maydonini klientga uzatish uchun tayyorlaydi: xom qiymat (hisob uchun)
 * va formatlangan matn (ko'rsatish uchun) birga ketadi.
 */
export type MoneyDTO = {
  /** Tiyin, matn sifatida — aniqlik yo'qolmaydi */
  raw: string;
  /** Tayyor ko'rinish: "1 500 000 so'm" */
  formatted: string;
  /** Qisqa ko'rinish: "1,5 mln so'm" */
  compact: string;
};

export function toMoneyDTO(amount: Tiyin): MoneyDTO {
  return {
    raw: serializeAmount(amount),
    formatted: formatMoney(amount),
    compact: formatMoneyCompact(amount),
  };
}

/** Bir nechta summani xavfsiz qo'shadi. */
export function sumAmounts(amounts: readonly Tiyin[]): Tiyin {
  return amounts.reduce<Tiyin>((total, amount) => total + amount, 0n);
}
