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
  tags: { uz: "Teglar", ru: "Теги", en: "Tags" },
  allTags: { uz: "Barcha teglar", ru: "Все теги", en: "All tags" },
  archive: { uz: "Arxiv", ru: "Архив", en: "Archive" },
  listen: { uz: "Tinglash", ru: "Слушать", en: "Listen" },
  pause: { uz: "To'xtatish", ru: "Пауза", en: "Pause" },
  readingMode: { uz: "O'qish rejimi", ru: "Режим чтения", en: "Reading mode" },
  fontSize: { uz: "Shrift", ru: "Шрифт", en: "Font" },
  translate: { uz: "Tarjima", ru: "Перевод", en: "Translate" },
  original: { uz: "Original", ru: "Оригинал", en: "Original" },
  tldr: { uz: "Qisqacha", ru: "Кратко", en: "TL;DR" },
  askAi: { uz: "Maqoladan so'rang", ru: "Спросить статью", en: "Ask this article" },
  askPlaceholder: { uz: "Savolingizni yozing...", ru: "Задайте вопрос...", en: "Ask a question..." },
  askHint: { uz: "AI faqat shu maqola asosida javob beradi", ru: "ИИ отвечает только по этой статье", en: "AI answers only from this article" },
  faqTitle: { uz: "Ko'p so'raladigan savollar", ru: "Частые вопросы", en: "FAQ" },
  postsInTag: { uz: "yozuv", ru: "записей", en: "posts" },
  quickSearch: { uz: "Tez qidiruv", ru: "Быстрый поиск", en: "Quick search" },
  like: { uz: "Yoqdi", ru: "Нравится", en: "Like" },
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
