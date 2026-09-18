// Shaxsiy sayt interfeysi uchun ko'p til (uz/ru/en).
// Maqola MATNI o'zi yozilgan tilda qoladi; bu yerda faqat interfeys yozuvlari.
import { cookies } from "next/headers";

export type Lang = "uz" | "ru" | "en";
export const LANGS: Lang[] = ["uz", "ru", "en"];
export const LANG_LABEL: Record<Lang, string> = { uz: "O'z", ru: "Ру", en: "En" };

type Dict = Record<string, Record<Lang, string>>;

export const DICT: Dict = {
  blog: { uz: "Blog", ru: "Блог", en: "Blog" },
  projects: { uz: "Loyihalar", ru: "Проекты", en: "Projects" },
  about: { uz: "Men haqimda", ru: "Обо мне", en: "About" },
  channel: { uz: "Kanal", ru: "Канал", en: "Channel" },
  readBlog: { uz: "Blogni o'qish", ru: "Читать блог", en: "Read blog" },
  home: { uz: "Bosh sahifa", ru: "Главная", en: "Home" },
  allPosts: { uz: "Barcha yozuvlar", ru: "Все записи", en: "All posts" },
  minutes: { uz: "daqiqa", ru: "мин", en: "min" },
  toc: { uz: "Mundarija", ru: "Содержание", en: "Contents" },
  share: { uz: "Ulashish", ru: "Поделиться", en: "Share" },
  liked: { uz: "Maqola yoqdimi?", ru: "Понравилось?", en: "Did you like it?" },
  recommend: { uz: "Tavsiya etamiz", ru: "Рекомендуем", en: "Recommended" },
  comments: { uz: "Izohlar", ru: "Комментарии", en: "Comments" },
  leaveComment: { uz: "Fikr bildiring", ru: "Оставьте отзыв", en: "Leave a comment" },
  yourName: { uz: "Ismingiz", ru: "Ваше имя", en: "Your name" },
  send: { uz: "Yuborish", ru: "Отправить", en: "Send" },
  noComments: { uz: "Hali izoh yo'q. Birinchi bo'lib fikr bildiring.", ru: "Пока нет комментариев.", en: "No comments yet." },
  search: { uz: "Qidirish...", ru: "Поиск...", en: "Search..." },
  saved: { uz: "Saqlangan", ru: "Сохранённые", en: "Saved" },
  series: { uz: "Turkum", ru: "Серия", en: "Series" },
  part: { uz: "qism", ru: "часть", en: "part" },
  subscribeTitle: { uz: "Yangi maqolalardan xabardor bo'ling", ru: "Будьте в курсе новых статей", en: "Stay updated on new posts" },
  scheduled: { uz: "Rejalashtirilgan", ru: "Запланировано", en: "Scheduled" },
  notFound: { uz: "Sahifa topilmadi", ru: "Страница не найдена", en: "Page not found" },
};

/** Cookie'dan tanlangan tilni oladi (default uz). */
export async function getLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const v = store.get("site_lang")?.value as Lang | undefined;
    if (v && LANGS.includes(v)) return v;
  } catch {}
  return "uz";
}

/** Tarjima. */
export function tr(lang: Lang, key: keyof typeof DICT): string {
  return DICT[key]?.[lang] || DICT[key]?.uz || String(key);
}
