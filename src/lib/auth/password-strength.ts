/**
 * PAROL MUSTAHKAMLIGINI TEKSHIRISH
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Nega `password.ts` dan AJRATILGAN
 *
 *  Bu funksiya klientda ham kerak — foydalanuvchi yozayotganda mustahkamlik
 *  ko'rsatkichini jonli ko'rsatish uchun.
 *
 *  `password.ts` esa `bcryptjs` ni import qiladi. Agar tekshiruv o'sha
 *  faylda qolsa, bcrypt butun klient bundle'iga tushardi — hashlash
 *  brauzerda hech qachon bajarilmasa ham.
 *
 *  Shu sababli: mustahkamlik qoidalari bu yerda (toza, bog'liqliksiz),
 *  hashlash esa `password.ts` da (faqat serverda).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt 72 BAYTdan keyingi qismni JIMGINA kesib tashlaydi.
 *
 * Bu jiddiy xavf: foydalanuvchi 100 belgili parol qo'yib xotirjam bo'ladi,
 * aslida esa faqat birinchi 72 bayt tekshiriladi. Shu sababli uzunlik
 * oldindan cheklanadi.
 *
 * Diqqat: BAYT, belgi emas. Kirill harflari 2 bayt, emoji 4 baytgacha oladi.
 */
export const MAX_PASSWORD_BYTES = 72;

/**
 * Eng ko'p ishlatiladigan va shu sababli darhol buziladigan parollar.
 *
 * To'liq ro'yxat emas (u millionlab qatordan iborat) — asosiy himoya
 * uzunlik va xilma-xillikda. Bu ro'yxat faqat eng ko'p uchraydiganlarni,
 * shu jumladan mahalliy variantlarni to'sadi.
 */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "1234567890", "qwerty123", "qwertyui",
  "11111111", "abc12345", "password1", "password123", "admin123", "welcome1",
  "iloveyou", "letmein1", "monkey123", "dragon123", "sunshine",
  // Mahalliy variantlar
  "parol123", "ozodflow", "toshkent", "uzbekistan", "andijon1", "samarqand",
  "1q2w3e4r", "qwerty12", "asdfghjk", "zxcvbnm1",
]);

export type PasswordCheck = {
  ok: boolean;
  /** 0..4 — ko'rsatkich chizig'i uchun */
  score: number;
  problems: string[];
};

/**
 * Parolni tekshiradi va TUSHUNARLI muammolar ro'yxatini qaytaradi.
 *
 * "Parol yetarli mustahkam emas" degan xabar foydasiz — foydalanuvchi
 * nimani tuzatishni bilmaydi. Shuning uchun har bir shart alohida aytiladi.
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
  if (password.length > 0 && /^(.)\1+$/.test(password)) {
    problems.push("Bir xil belgilardan iborat bo'lmasin");
  }

  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const lengthBonus = password.length >= 16 ? 2 : password.length >= 12 ? 1 : 0;
  const score = Math.min(4, Math.max(0, variety - 1 + lengthBonus));

  return { ok: problems.length === 0, score, problems };
}

/** Ko'rsatkich yorlig'i. */
export function passwordScoreLabel(score: number): string {
  return ["Juda zaif", "Zaif", "O'rtacha", "Yaxshi", "Kuchli"][score] ?? "Zaif";
}
