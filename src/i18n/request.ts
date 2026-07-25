import { getRequestConfig } from "next-intl/server";

/**
 * i18n sozlamasi — "routing'siz" rejim.
 *
 * Hozir bitta til (o'zbek) bor va URL'da til prefiksi YO'Q: ozodflow.uz/dev/...
 * Lekin barcha matnlar `messages/uz.json` da tashqarida turadi, shuning uchun
 * `ru` va `en` qo'shish keyinchalik faqat tarjima ishi bo'ladi — komponentlarni
 * qayta yozish kerak emas.
 *
 * Ko'p tilga o'tganda: bu yerga `[locale]` segmenti va `routing.ts` qo'shiladi,
 * komponentlardagi `t("...")` chaqiruvlari o'zgarmaydi.
 */

export const DEFAULT_LOCALE = "uz" as const;

/** Kelajakda qo'shiladigan tillar. Hozir faqat `uz` faol. */
export const SUPPORTED_LOCALES = ["uz"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Sana va vaqt hamma joyda Toshkent vaqtida ko'rsatiladi — server qaysi
    // mintaqada turishidan qat'i nazar bir xil natija chiqadi.
    timeZone: "Asia/Tashkent",
  };
});
