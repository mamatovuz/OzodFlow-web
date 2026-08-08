// Mijoz menyusi tillari
export type Lang = "uz" | "ru" | "en";

export const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: "uz", label: "O'z", flag: "🇺🇿" },
  { key: "ru", label: "Ру", flag: "🇷🇺" },
  { key: "en", label: "En", flag: "🇬🇧" },
];

// uz asosiy; ru/en bo'sh bo'lsa uz'ga qaytadi
export function loc(
  base: string | null | undefined,
  ru: string | null | undefined,
  en: string | null | undefined,
  lang: Lang
): string {
  if (lang === "ru") return (ru && ru.trim()) || base || "";
  if (lang === "en") return (en && en.trim()) || base || "";
  return base || "";
}

// UI matnlari (menyu elementlari)
export const UI: Record<Lang, Record<string, string>> = {
  uz: {
    search: "Taom qidirish...",
    all: "Barchasi",
    recommended: "Tavsiya etamiz",
    cart: "Savat",
    checkout: "Rasmiylashtirish",
    empty: "Hech narsa topilmadi",
    gallery: "Galereya",
    closed: "Hozir restoran yopiq",
    addToCart: "Savatga qo'shish",
    add: "Qo'shish",
    notAvailable: "Mavjud emas",
    you: "Siz",
    items: "ta taom",
    myLocation: "Mening joylashuvim",
    pickOnMap: "Nuqta qo'yish uchun xaritaga bosing",
    addressPicked: "Manzil tanlandi",
    sendOrder: "Buyurtmani yuborish",
    delivery: "Yetkazib berish",
  },
  ru: {
    search: "Поиск блюд...",
    all: "Все",
    recommended: "Рекомендуем",
    cart: "Корзина",
    checkout: "Оформить",
    empty: "Ничего не найдено",
    gallery: "Галерея",
    closed: "Ресторан сейчас закрыт",
    addToCart: "В корзину",
    add: "Добавить",
    notAvailable: "Нет в наличии",
    you: "Вы",
    items: "блюд",
    myLocation: "Моё местоположение",
    pickOnMap: "Нажмите на карту, чтобы поставить точку",
    addressPicked: "Адрес выбран",
    sendOrder: "Отправить заказ",
    delivery: "Доставка",
  },
  en: {
    search: "Search dishes...",
    all: "All",
    recommended: "Recommended",
    cart: "Cart",
    checkout: "Checkout",
    empty: "Nothing found",
    gallery: "Gallery",
    closed: "Restaurant is closed now",
    addToCart: "Add to cart",
    add: "Add",
    notAvailable: "Unavailable",
    you: "You",
    items: "items",
    myLocation: "My location",
    pickOnMap: "Tap the map to drop a pin",
    addressPicked: "Address selected",
    sendOrder: "Send order",
    delivery: "Delivery",
  },
};
