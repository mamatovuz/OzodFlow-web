export const TG_SUPPORT = "https://t.me/OzodFlow_uz";
export const TG_CHANNEL = "https://t.me/OzodFlow";
export const SITE_DATA_STORAGE_KEY = "ozodflow-site-data";
export const SITE_DATA_API_URL = import.meta.env?.VITE_DATA_API_URL || "/api/site-data";

export const DEFAULT_SITE_DATA = {
  services: [
    {
      id: "landing-page",
      icon: "Globe",
      title: "Landing Page",
      desc: "Mahsulot yoki xizmat uchun bir sahifali, konversiyaga yo'naltirilgan sayt.",
      price: "1 500 000",
      deadline: "5-10 kun",
      items: ["Unikal dizayn", "Mobil moslashuv", "SEO asoslari", "Domen yordami"],
      featured: false,
    },
    {
      id: "telegram-bot",
      icon: "Bot",
      title: "Telegram Bot",
      desc: "Buyurtma, mijozlar va avtomatlashtirish uchun maxsus bot.",
      price: "2 000 000",
      deadline: "7-14 kun",
      items: ["Admin panel", "To'lov integratsiyasi", "Google Sheets / CRM", "Bildirishnomalar"],
      featured: true,
    },
    {
      id: "crm-tizim",
      icon: "Database",
      title: "CRM Tizim",
      desc: "Mijozlar, sotuvlar va xodimlarni boshqaruvchi maxsus dasturiy tizim.",
      price: "6 000 000",
      deadline: "3-6 hafta",
      items: ["Rollar va ruxsatlar", "Hisobotlar", "Telegram integratsiya", "Cloud hosting"],
      featured: false,
    },
    {
      id: "biznes-sayt",
      icon: "LayoutGrid",
      title: "Biznes Sayt",
      desc: "Ko'p sahifali korporativ sayt, blog yoki katalog. To'liq admin panel.",
      price: "3 500 000",
      deadline: "2-4 hafta",
      items: ["Admin panel", "Blog / katalog", "Ko'p tilli", "Domen + hosting"],
      featured: false,
    },
  ],
  projects: [
    {
      id: "restaurant-bot",
      title: "Restoran buyurtma boti",
      category: "Telegram Bot",
      desc: "Menyu, savat, filial tanlash va admin xabarnomalari bilan buyurtma qabul qiluvchi bot.",
      result: "Buyurtmalar tezligi oshdi",
      stack: ["Telegram", "Node.js", "Google Sheets"],
      url: "https://t.me/OzodFlow",
    },
    {
      id: "sales-crm",
      title: "Sotuv bo'limi CRM",
      category: "CRM Tizim",
      desc: "Leadlar, mijoz statuslari, xodim rollari va kunlik hisobotlar uchun ichki tizim.",
      result: "Jarayonlar nazoratga olindi",
      stack: ["React", "Node.js", "PostgreSQL"],
      url: "https://t.me/OzodFlow",
    },
    {
      id: "product-landing",
      title: "Mahsulot landing sahifasi",
      category: "Landing Page",
      desc: "Reklamadan kelgan mijozlar uchun tez yuklanadigan, aloqa tugmalari aniq joylashgan sahifa.",
      result: "Konversiya yaxshilandi",
      stack: ["React", "Tailwind", "SEO"],
      url: "https://t.me/OzodFlow",
    },
    {
      id: "clinic-site",
      title: "Klinika biznes sayti",
      category: "Biznes Sayt",
      desc: "Xizmatlar, shifokorlar, narxlar va qabulga yozilish bo'limlari bo'lgan ko'p sahifali sayt.",
      result: "Online murojaatlar ko'paydi",
      stack: ["React", "Admin panel", "Hosting"],
      url: "https://t.me/OzodFlow",
    },
    {
      id: "education-platform",
      title: "O'quv markaz landing",
      category: "Landing Page",
      desc: "Kurslar, ustozlar, jadval va Telegram orqali ro'yxatdan o'tish oqimi bilan sahifa.",
      result: "Ro'yxatdan o'tish qulaylashdi",
      stack: ["React", "Forms", "Analytics"],
      url: "https://t.me/OzodFlow",
    },
    {
      id: "warehouse-panel",
      title: "Ombor nazorat paneli",
      category: "CRM Tizim",
      desc: "Mahsulot qoldig'i, kirim-chiqim, xodimlar va eksport hisobotlarini boshqarish paneli.",
      result: "Hisobotlar avtomatlashtirildi",
      stack: ["React", "Node.js", "Reports"],
      url: "https://t.me/OzodFlow",
    },
  ],
};

export function normalizeSiteData(data) {
  return {
    services: Array.isArray(data?.services) ? data.services : DEFAULT_SITE_DATA.services,
    projects: Array.isArray(data?.projects) ? data.projects : DEFAULT_SITE_DATA.projects,
  };
}

export function getStoredSiteData() {
  if (typeof window === "undefined") return DEFAULT_SITE_DATA;

  try {
    const stored = window.localStorage.getItem(SITE_DATA_STORAGE_KEY);
    return stored ? normalizeSiteData(JSON.parse(stored)) : DEFAULT_SITE_DATA;
  } catch {
    return DEFAULT_SITE_DATA;
  }
}

export function storeSiteData(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SITE_DATA_STORAGE_KEY, JSON.stringify(normalizeSiteData(data)));
}

export async function fetchSiteData(options = {}) {
  const response = await fetch(SITE_DATA_API_URL, {
    signal: options.signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Site data could not be loaded");
  }

  return normalizeSiteData(await response.json());
}

export async function saveSiteData(data) {
  const normalized = normalizeSiteData(data);
  storeSiteData(normalized);

  const response = await fetch(SITE_DATA_API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    throw new Error("Site data could not be saved");
  }

  return normalizeSiteData(await response.json());
}
