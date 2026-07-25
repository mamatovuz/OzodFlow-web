import { compare, hash } from "bcryptjs";

import { MAX_PASSWORD_BYTES } from "@/lib/auth/password-strength";

/**
 * PAROL HASHLASH — faqat serverda.
 *
 * Mustahkamlik qoidalari `password-strength.ts` da: u klientda ham kerak,
 * bu fayl esa `bcryptjs` ni tortib keladi va brauzerga tushmasligi kerak.
 *
 * bcrypt tanlandi (argon2 emas) — sababi amaliy: argon2 native modul talab
 * qiladi, Windows'da o'rnatilishi muammoli va Docker image'ga kompilyator
 * qo'shishga to'g'ri keladi. `bcryptjs` toza JavaScript.
 *
 * Kelajakda argon2id ga o'tish kerak bo'lsa: hash prefiksiga qarab
 * ikkalasini tekshirish va kirish paytida jimgina qayta hashlash mumkin.
 */

/**
 * bcrypt "cost" — 2^12 = 4096 iteratsiya.
 *
 * 12 — 2026 yil uchun maqbul muvozanat: zamonaviy serverda ~250ms.
 * Kamroq qilish brute-force'ni osonlashtiradi, ko'proq qilish esa kirish
 * sahifasini sekinlashtiradi va DoS uchun yo'l ochadi.
 */
const BCRYPT_COST = 12;

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
 * Timing himoyasi uchun zaxira hash.
 *
 * Bu HAQIQIY bcrypt hash (cost 12), 32 baytlik tasodifiy qiymatdan olingan —
 * unga mos keladigan parolni hech kim bilmaydi. Haqiqiy bo'lishi SHART:
 * soxta matn berilsa bcrypt formatni tanimay darhol xato qaytaradi va
 * javob vaqti farqi bilinib qoladi, ya'ni himoyaning o'zi ishlamaydi.
 */
const FAKE_HASH = "$2b$12$xCb1Qvt9ACS0auytl.cnUOgwVRQik6NbVFiHT7wBa0n1DnpxW7sXa";

/**
 * Parolni hash bilan solishtiradi.
 *
 * Hash bo'lmasa ham bcrypt DOIM chaqiriladi — aks holda "bu foydalanuvchida
 * parol yo'q" yoki "bunday foydalanuvchi yo'q" ma'lumoti javob tezligidan
 * bilinib qolardi. Hujumchi shu orqali mavjud hisoblarni sanab chiqishi
 * mumkin edi.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string | null
): Promise<boolean> {
  // OTP yoki Telegram bilan ro'yxatdan o'tgan foydalanuvchida parol yo'q.
  const target = passwordHash || FAKE_HASH;

  try {
    const matches = await compare(password, target);
    return passwordHash ? matches : false;
  } catch {
    return false;
  }
}

// Qulaylik uchun qayta eksport: chaqiruvchi kod ikki fayldan import
// qilib yurmasligi uchun.
export {
  PASSWORD_MIN_LENGTH,
  MAX_PASSWORD_BYTES,
  checkPasswordStrength,
  passwordScoreLabel,
  type PasswordCheck,
} from "@/lib/auth/password-strength";
