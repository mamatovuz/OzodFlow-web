export const TG_SUPPORT = "https://t.me/OzodFlow_uz";
export const TG_CHANNEL = "https://t.me/OzodFlow";
export const SITE_DATA_STORAGE_KEY = "ozodflow-site-data";
export const SITE_DATA_API_URL = import.meta.env?.VITE_DATA_API_URL || "/api/site-data";
export const LEAD_API_URL = import.meta.env?.VITE_LEAD_API_URL || "/api/lead";

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
      price: "1 200 000",
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
      items: ["Rollar va ruxsatlar", "Hisobotlar", "Telegram integratsiya"],
      featured: false,
    },
    {
      id: "biznes-sayt",
      icon: "LayoutGrid",
      title: "Biznes Sayt",
      desc: "Ko'p sahifali korporativ sayt, blog yoki katalog. To'liq admin panel.",
      price: "3 500 000",
      deadline: "2-4 hafta",
      items: ["Admin panel", "Blog / katalog", "Ko'p tilli"],
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
      image: "",
    },
    {
      id: "sales-crm",
      title: "Sotuv bo'limi CRM",
      category: "CRM Tizim",
      desc: "Leadlar, mijoz statuslari, xodim rollari va kunlik hisobotlar uchun ichki tizim.",
      result: "Jarayonlar nazoratga olindi",
      stack: ["React", "Node.js", "PostgreSQL"],
      url: "https://t.me/OzodFlow",
      image: "",
    },
    {
      id: "product-landing",
      title: "Mahsulot landing sahifasi",
      category: "Landing Page",
      desc: "Reklamadan kelgan mijozlar uchun tez yuklanadigan, aloqa tugmalari aniq joylashgan sahifa.",
      result: "Konversiya yaxshilandi",
      stack: ["React", "Tailwind", "SEO"],
      url: "https://t.me/OzodFlow",
      image: "",
    },
    {
      id: "clinic-site",
      title: "Klinika biznes sayti",
      category: "Biznes Sayt",
      desc: "Xizmatlar, shifokorlar, narxlar va qabulga yozilish bo'limlari bo'lgan ko'p sahifali sayt.",
      result: "Online murojaatlar ko'paydi",
      stack: ["React", "Admin panel", "Hosting"],
      url: "https://t.me/OzodFlow",
      image: "",
    },
    {
      id: "education-platform",
      title: "O'quv markaz landing",
      category: "Landing Page",
      desc: "Kurslar, ustozlar, jadval va Telegram orqali ro'yxatdan o'tish oqimi bilan sahifa.",
      result: "Ro'yxatdan o'tish qulaylashdi",
      stack: ["React", "Forms", "Analytics"],
      url: "https://t.me/OzodFlow",
      image: "",
    },
    {
      id: "warehouse-panel",
      title: "Ombor nazorat paneli",
      category: "CRM Tizim",
      desc: "Mahsulot qoldig'i, kirim-chiqim, xodimlar va eksport hisobotlarini boshqarish paneli.",
      result: "Hisobotlar avtomatlashtirildi",
      stack: ["React", "Node.js", "Reports"],
      url: "https://t.me/OzodFlow",
      image: "",
    },
  ],
  testimonials: [
    {
      id: "t-restaurant",
      name: "Jasur Karimov",
      role: "Restoran egasi, Andijon",
      text: "Telegram bot orqali buyurtmalar ancha tezlashdi. Ozodbek aytgan muddatda, sifatli qilib topshirdi. Tavsiya qilaman.",
      rating: 5,
    },
    {
      id: "t-clinic",
      name: "Dilnoza Rahimova",
      role: "Klinika rahbari",
      text: "Saytdan keyin online murojaatlar sezilarli ko'paydi. Har bir savolga tez javob berdi, ishi puxta.",
      rating: 5,
    },
    {
      id: "t-shop",
      name: "Bobur Tursunov",
      role: "Online do'kon",
      text: "CRM tizim ishimizni butunlay tartibga soldi. Vositachisiz, to'g'ridan-to'g'ri dasturchi bilan ishlash juda qulay.",
      rating: 5,
    },
  ],
};

function normalizeProject(project) {
  return { image: "", ...project };
}

export function normalizeSiteData(data) {
  const projects = Array.isArray(data?.projects)
    ? data.projects.map(normalizeProject)
    : DEFAULT_SITE_DATA.projects;

  return {
    services: Array.isArray(data?.services) ? data.services : DEFAULT_SITE_DATA.services,
    projects,
    testimonials: Array.isArray(data?.testimonials)
      ? data.testimonials
      : DEFAULT_SITE_DATA.testimonials,
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
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error("Site data could not be loaded");
  }

  return normalizeSiteData(await response.json());
}

export async function verifyAdminLogin({ login, password }) {
  const response = await fetch(SITE_DATA_API_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ login, password }),
  });

  if (!response.ok) {
    throw new Error("Admin login failed");
  }

  return true;
}

export async function submitLead(lead, options = {}) {
  const response = await fetch(LEAD_API_URL, {
    method: "POST",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    throw new Error("Lead could not be submitted");
  }

  return true;
}

export async function saveSiteData(data, options = {}) {
  const normalized = normalizeSiteData(data);
  storeSiteData(normalized);

  const response = await fetch(SITE_DATA_API_URL, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Password": options.password ?? "",
    },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    throw new Error("Site data could not be saved");
  }

  return normalizeSiteData(await response.json());
}
