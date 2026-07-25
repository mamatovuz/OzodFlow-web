import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind sinflarini birlashtiradi va ziddiyatlarni hal qiladi.
 * `cn("px-2", "px-4")` → `"px-4"` (oxirgisi ustun).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL uchun mos slug yasaydi. O'zbek lotin alifbosidagi apostrof va
 * maxsus belgilarni tozalaydi.
 *
 *   slugify("Telegram bot — 3 kunda!") → "telegram-bot-3-kunda"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // o'zbekcha apostroflarni olib tashlash: o'zbek → ozbek
    .replace(/['''`ʻʼ]/g, "")
    // kirill → lotin (blog va kategoriya nomlari uchun)
    .replace(/[а-яё]/g, (char) => CYRILLIC_MAP[char] ?? "")
    // qolgan hamma narsa chiziqcha
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu",
  я: "ya",
};

/**
 * Loyiha uchun inson o'qiy oladigan qisqa kod: "OZF-4F2A91".
 * Chat, invoice va support murojaatlarida loyihani shu kod bilan atashadi.
 *
 * Adashtiradigan belgilar (0/O, 1/I) alifbodan chiqarilgan — telefonda
 * aytilganda xato bo'lmasligi uchun.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generatePublicId(prefix = "OZF"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${prefix}-${code}`;
}

/** Foydalanuvchi ismidan avatar uchun bosh harflar: "Ozodbek Mamatov" → "OM" */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Matnni belgilangan uzunlikda kesadi va "…" qo'shadi. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Fayl hajmini o'qiladigan ko'rinishga keltiradi. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = size < 10 ? size.toFixed(1).replace(".", ",") : Math.round(size).toString();
  return `${rounded} ${units[unitIndex]}`;
}

/**
 * Telefon raqamini O'zbekiston formatiga normalizatsiya qiladi:
 * "+998 93 230 34 10", "998932303410", "932303410" → "+998932303410"
 *
 * Normalizatsiya muhim: bir xil raqam turli ko'rinishda yozilsa, DB'da
 * ikkita hisob paydo bo'lib qoladi.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;

  return null;
}

/** Telefon raqamini ko'rsatish uchun: "+998932303410" → "+998 93 230 34 10" */
export function formatPhone(phone: string): string {
  const match = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  if (!match) return phone;
  return `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}

/** Emailni normalizatsiya qiladi (kichik harf, chetlardagi probellar). */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}
