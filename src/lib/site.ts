/**
 * Sayt haqidagi doimiy ma'lumotlar — SEO, metadata va footer shu yerdan oladi.
 *
 * `NEXT_PUBLIC_` prefiksli o'zgaruvchi build vaqtida kodga singdiriladi,
 * shuning uchun bu fayl klientda ham xavfsiz ishlaydi (maxfiy kalit yo'q).
 */

export const SITE = {
  name: "OzodFlow",
  /** Domen. Docker build vaqtida env berilmasa ham metadata buzilmasin. */
  url: process.env.NEXT_PUBLIC_APP_URL || "https://ozodflow.uz",
  locale: "uz_UZ",

  /** Qisqa tavsif — Open Graph va meta description uchun asos. */
  tagline: "Tekshirilgan mutaxassislar bilan raqamli loyihalar",
  description:
    "OzodFlow — sayt, Telegram bot, mobil ilova va dizayn buyurtma qiladigan " +
    "platforma. Escrow tizimi pulingizni ish qabul qilinmaguncha himoyada saqlaydi.",

  /** Aloqa — legacy saytdan olingan haqiqiy ma'lumotlar. */
  contact: {
    telegram: "https://t.me/ozodflow",
    telegramChannel: "https://t.me/ozodflow_uz",
    email: "info@ozodflow.uz",
    phone: "+998932303410",
    city: "Andijon",
  },

  ogImage: "/og-image.png",
} as const;

/**
 * Domen — protokolsiz ko'rinish (`ozodflow.uz`).
 *
 * Formalarda va yorliqlarda ishlatiladi: `https://` prefiksi joyni
 * bekorga egallaydi va foydalanuvchi uni o'qimaydi.
 *
 * `URL` konstruktori ishlatiladi, matn kesish emas: `url` da port yoki
 * yo'l bo'lishi mumkin (`http://localhost:3000`) va uni qo'lda
 * ajratish xatoga olib keladi.
 */
export const SITE_HOST = new URL(SITE.url).host;

/** Ommaviy developer profili manzili: /dev/username */
export function developerProfileUrl(username: string): string {
  return `${SITE.url}/dev/${username}`;
}

/** Loyiha sahifasi manzili. */
export function projectUrl(publicId: string): string {
  return `${SITE.url}/projects/${publicId}`;
}
