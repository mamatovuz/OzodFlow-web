import { env, features } from "@/lib/env";

/**
 * EMAIL YUBORISH
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  HOZIRGI HOLAT — ochiq aytilgan cheklov
 *
 *  SMTP sozlanmagan bo'lsa xat YUBORILMAYDI, balki server log'iga yoziladi.
 *  Bu vaqtinchalik yechim emas, ATAYLAB tanlangan xatti-harakat:
 *
 *    • ishlab chiqishda haqiqiy SMTP kerak bo'lmaydi — havolani log'dan
 *      olib, oqimni to'liq sinash mumkin
 *    • xat yuborilmagani uchun parol tiklash oqimi YIQILMAYDI
 *    • log SERVERDA qoladi, foydalanuvchiga ko'rsatilmaydi — bu muhim,
 *      aks holda istalgan odam boshqa hisobning tiklash havolasini
 *      olib qo'yardi
 *
 *  SMTP sozlangach (`SMTP_HOST` va `SMTP_USER`) haqiqiy jo'natish uchun
 *  transport ulanishi kerak — pastdagi `deliver()` ichida ko'rsatilgan joy.
 *  Buning uchun `nodemailer` paketi qo'shiladi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type MailMessage = {
  to: string;
  subject: string;
  /** Oddiy matn ko'rinishi — HTML o'chirilgan klientlar uchun majburiy */
  text: string;
  html?: string;
};

export type MailResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "failed" };

/**
 * Xat yuboradi.
 *
 * MUHIM: bu funksiya XATO TASHLAMAYDI. Chaqiruvchi oqim (parol tiklash,
 * email tasdiqlash) xat yuborilmagani uchun to'xtamasligi kerak —
 * foydalanuvchiga har holda bir xil javob beriladi.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (!features.email) {
    logToConsole(message, "SMTP sozlanmagan");
    return { delivered: false, reason: "not_configured" };
  }

  try {
    await deliver(message);
    return { delivered: true };
  } catch (error) {
    console.error("[mail] Yuborilmadi:", error);
    logToConsole(message, "yuborish xatosi");
    return { delivered: false, reason: "failed" };
  }
}

/**
 * Haqiqiy jo'natish.
 *
 * SMTP transport shu yerga ulanadi:
 *
 *   const transport = nodemailer.createTransport({
 *     host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
 *     auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
 *   });
 *   await transport.sendMail({ from: env.MAIL_FROM, ...message });
 *
 * Hozircha `features.email` false bo'lgani uchun bu yerga kelinmaydi.
 */
async function deliver(message: MailMessage): Promise<void> {
  throw new Error(
    `SMTP transport hali ulanmagan (${message.to} ga xat yuborilmadi). ` +
      `src/lib/mail.ts dagi deliver() funksiyasiga qarang.`
  );
}

/**
 * Xatni server log'iga yozadi.
 *
 * Log FAQAT serverda ko'rinadi. Havolani foydalanuvchi javobiga qo'shish
 * jiddiy zaiflik bo'lardi: "parolni tiklash" formasiga begona email
 * kiritgan odam o'sha hisobning tiklash havolasini olib qo'yardi.
 */
function logToConsole(message: MailMessage, reason: string): void {
  console.info(
    [
      "",
      "┌─ EMAIL (yuborilmadi: " + reason + ") ─────────────────────────",
      `│ Kimga:   ${message.to}`,
      `│ Kimdan:  ${env.MAIL_FROM}`,
      `│ Mavzu:   ${message.subject}`,
      "├───────────────────────────────────────────────────────────",
      ...message.text.split("\n").map((line) => `│ ${line}`),
      "└───────────────────────────────────────────────────────────",
      "",
    ].join("\n")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Xat shablonlari
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shablonlar KODDA turadi (databaseda emas).
 *
 * Sababi: bu xatlar xavfsizlik oqimining bir qismi. Admin panel orqali
 * tahrirlanadigan bo'lsa, kimdir tasodifan `{{link}}` o'rnini o'chirib
 * qo'yishi va parol tiklash butunlay ishlamay qolishi mumkin.
 *
 * Marketing xatlari (yangiliklar, e'lonlar) esa admin panelda bo'ladi.
 */

export function passwordResetMail(params: {
  to: string;
  name: string;
  link: string;
  expiresInMinutes: number;
}): MailMessage {
  return {
    to: params.to,
    subject: "OzodFlow — parolni tiklash",
    text: [
      `Salom, ${params.name}!`,
      "",
      "Hisobingiz parolini tiklash so'rovi keldi. Yangi parol o'rnatish uchun",
      "quyidagi havolani oching:",
      "",
      params.link,
      "",
      `Havola ${params.expiresInMinutes} daqiqa amal qiladi.`,
      "",
      "Agar bu so'rovni siz yubormagan bo'lsangiz — bu xatga e'tibor bermang.",
      "Parolingiz o'zgarmaydi.",
      "",
      "OzodFlow",
    ].join("\n"),
  };
}

export function emailVerificationMail(params: {
  to: string;
  name: string;
  link: string;
}): MailMessage {
  return {
    to: params.to,
    subject: "OzodFlow — emailni tasdiqlash",
    text: [
      `Salom, ${params.name}!`,
      "",
      "Emailingizni tasdiqlash uchun quyidagi havolani oching:",
      "",
      params.link,
      "",
      "Tasdiqlangandan keyin to'lov va yechib olish amallariga ruxsat ochiladi.",
      "",
      "OzodFlow",
    ].join("\n"),
  };
}
