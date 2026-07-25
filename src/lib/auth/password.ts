import { compare, hash } from "bcryptjs";

/**
 * Parol bilan ishlash.
 *
 * bcrypt tanlandi (argon2 emas) — sababi amaliy: argon2 native modul talab
 * qiladi va Windows'da o'rnatilishi muammoli, Docker image'da esa build
 * bosqichi kerak bo'ladi. `bcryptjs` toza JavaScript, hech qanday kompilyator
 * kerak emas va bcrypt formatiga mos.
 *
 * Kelajakda argon2id ga o'tish kerak bo'lsa: hash prefiksiga qarab
 * ikkalasini ham tekshirish va kirish paytida jimgina qayta hashlash mumkin.
 */

/**
 * bcrypt "cost" — 2^12 = 4096 iteratsiya.
 *
 * 12 — 2026 yil uchun maqbul muvozanat: zamonaviy serverda ~250ms.
 * Kamroq qilish brute-force'ni osonlashtiradi, ko'proq qilish kirish
 * sahifasini sekinlashtiradi va DoS uchun yo'l ochadi.
 */
const BCRYPT_COST = 12;

/**
 * bcrypt 72 BAYTdan keyingi qismni JIMGINA kesib tashlaydi.
 *
 * Bu jiddiy xavf: agar foydalanuvchi 100 belgili parol qo'ysa, unga
 * ishonch hosil qiladi, lekin aslida faqat birinchi 72 bayt tekshiriladi.
 * Shu sababli uzunlikni oldindan tekshiramiz va aniq xato beramiz.
 *
 * Diqqat: BAYT, belgi emas. Kirill yoki emoji belgilari 2-4 bayt oladi.
 */
const MAX_PASSWORD_BYTES = 72;

export const PASSWORD_MIN_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  const byteLength = new TextEncoder().encode(password).length;

  if (byteLength > MAX_PASSWORD_BYTES) {
    throw new Error(
      `Parol juda uzun: ${byteLength} bayt. bcrypt ${MAX_PASSWORD_BYTES} baytdan ` +
        `ko'pini hisobga olmaydi, shuning uchun bunday parol qabul qilinmaydi.`
    );
  }

  return hash(password, BCRYPT_COST);
}

/**
 * Parolni hash bilan solishtiradi.
 *
 * Hash bo'sh yoki buzuq bo'lsa `false` qaytadi, lekin VAQT bo'yicha farq
 * qilmaslik uchun bcrypt'ning o'zi doim chaqiriladi — aks holda "bu
 * foydalanuvchida parol yo'q" ma'lumoti javob tezligidan bilinib qolardi.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string | null
): Promise<boolean> {
  // OTP yoki Telegram bilan ro'yxatdan o'tgan foydalanuvchida parol yo'q.
  // Soxta hash bilan solishtirib, javob vaqtini bir xil saqlaymiz.
  const target = passwordHash || FAKE_HASH;

  try {
    const matches = await compare(password, target);
    return passwordHash ? matches : false;
  } catch {
    return false;
  }
}

/**
 * Timing himoyasi uchun zaxira hash.
 *
 * Bu HAQIQIY bcrypt hash (cost 12), 32 baytlik tasodifiy qiymatdan olingan —
 * unga mos keladigan parolni hech kim bilmaydi. Haqiqiy bo'lishi SHART:
 * soxta matn berilsa bcrypt formatni tanimay darhol xato qaytaradi va
 * javob vaqti farqi bilinib qoladi, ya'ni himoyaning o'zi ishlamaydi.
 */
const FAKE_HASH = "$2b$12$xCb1Qvt9ACS0auytl.cnUOgwVRQik6NbVFiHT7wBa0n1DnpxW7sXa";

// ─────────────────────────────────────────────────────────────────────────────
// Parol mustahkamligi
// ─────────────────────────────────────────────────────────────────────────────

export type PasswordCheck = {
  ok: boolean;
  /** 0..4 — ko'rsatkich chizig'i uchun */
  score: number;
  problems: string[];
};

/**
 * Eng ko'p ishlatiladigan va shu sababli darhol buziladigan parollar.
 * To'liq ro'yxat emas — asosiy himoya uzunlik va xilma-xillikda.
 */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "1234567890", "qwerty123", "qwertyui",
  "11111111", "abc12345", "password1", "password123", "admin123", "welcome1",
  "iloveyou", "parol123", "ozodflow", "toshkent", "uzbekistan", "1q2w3e4r",
]);

/**
 * Parolni tekshiradi va TUSHUNARLI muammolar ro'yxatini qaytaradi.
 *
 * "Parol yetarli mustahkam emas" degan xabar foydasiz — foydalanuvchi nimani
 * tuzatishni bilmaydi. Shuning uchun har bir shart alohida aytiladi.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`Kamida ${PASSWORD_MIN_LENGTH} belgi bo'lishi kerak`);
  }

  const byteLength = new TextEncoder().encode(password).length;
  if (byteLength > MAX_PASSWORD_BYTES) {
    problems.push(`Juda uzun (maksimal ${MAX_PASSWORD_BYTES} bayt)`);
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^\w\s]/.test(password);

  if (!hasLower || !hasUpper) {
    problems.push("Katta va kichik harf bo'lishi kerak");
  }
  if (!hasDigit) {
    problems.push("Kamida bitta raqam bo'lishi kerak");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    problems.push("Bu parol juda ko'p ishlatiladi — boshqasini tanlang");
  }

  // Bir xil belgi ketma-ketligi: "aaaaaaaa"
  if (/^(.)\1+$/.test(password)) {
    problems.push("Bir xil belgilardan iborat bo'lmasin");
  }

  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const lengthBonus = password.length >= 16 ? 2 : password.length >= 12 ? 1 : 0;
  const score = Math.min(4, Math.max(0, variety - 1 + lengthBonus));

  return { ok: problems.length === 0, score, problems };
}
