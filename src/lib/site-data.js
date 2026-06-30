export const TG_SUPPORT = "https://t.me/OzodFlow_uz";
export const TG_CHANNEL = "https://t.me/OzodFlow";
export const SITE_DATA_STORAGE_KEY = "ozodflow-site-data";
export const SITE_DATA_API_URL = import.meta.env?.VITE_DATA_API_URL || "/api/site-data";
export const LEAD_API_URL = import.meta.env?.VITE_LEAD_API_URL || "/api/lead";
export const API_BASE = SITE_DATA_API_URL.replace(/\/site-data$/, "");
export const UPLOAD_API_URL = `${API_BASE}/upload`;
export const ADMIN_CREDENTIALS_API_URL = `${API_BASE}/admin-credentials`;
export const WORKSPACE_API_URL = `${API_BASE}/workspace`;
export const LEADS_API_URL = `${API_BASE}/leads`;

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
  posts: [
    {
      id: "post-telegram-bot",
      slug: "telegram-bot-biznesga-nima-beradi",
      title: "Telegram bot biznesingizga nima beradi?",
      excerpt:
        "Telegram bot — bu 24/7 ishlaydigan avtomatik yordamchi. Buyurtma qabul qilish, mijozlar bilan ishlash va sotuvni qanday oshirishini ko'rib chiqamiz.",
      cover: "",
      date: "2026-06-10",
      published: true,
      tags: ["Telegram bot", "Avtomatlashtirish"],
      content:
        "Telegram O'zbekistonda eng ko'p ishlatiladigan messenjerlardan biri. Shuning uchun biznes uchun aynan shu yerda bo'lish — mijozga eng yaqin joyda bo'lish demakdir.\n\n## Bot nimalarni avtomatlashtiradi?\n\nBot buyurtmalarni 24 soat qabul qiladi, mijoz ma'lumotlarini saqlaydi va sizga bildirishnoma yuboradi. Xodim uxlab yotганida ham bot ishlaydi.\n\n## Qanday natija beradi?\n\nKo'p bizneslar botdan keyin buyurtmalar tezligi va mijozlar mamnuniyati oshganini aytishadi. Eng muhimi — takrorlanuvchi ishlar avtomatlashadi va siz asosiy ishingizga vaqt ajratasiz.\n\nAgar biznesingiz uchun bot kerak bo'lsa, Telegram orqali yozing — bepul maslahat beraman.",
    },
    {
      id: "post-landing",
      slug: "landing-page-nima-uchun-kerak",
      title: "Landing page nima uchun kerak?",
      excerpt:
        "Yaxshi landing page — bu sizning 24 soat ishlaydigan sotuvchingiz. U nima uchun muhim va qanday qilib mijozni xaridorga aylantiradi?",
      cover: "",
      date: "2026-06-05",
      published: true,
      tags: ["Landing", "Marketing"],
      content:
        "Landing page — bu bitta maqsadga yo'naltirilgan sahifa: mijozni harakatga undash. Reklama bergan bo'lsangiz, odam aynan shu sahifaga tushadi.\n\n## Nima uchun oddiy sayt yetarli emas?\n\nKo'p sahifali sayt e'tiborni tarqatadi. Landing esa bitta xizmat yoki mahsulotга diqqatni jamlaydi va konversiyani oshiradi.\n\n## Yaxshi landing'ning sirlari\n\nTez yuklanish, aniq taklif, ishonch belgilari (sharhlar, kafolat) va ko'rinib turadigan aloqa tugmasi. Shu narsalar mijozni xaridorga aylantiradi.",
    },
  ],
  faqs: [
    {
      id: "faq-time",
      q: "Loyiha qancha vaqtda tayyor bo'ladi?",
      a: "Landing - 5-10 kun. Telegram bot - 1-2 hafta. CRM - 3-6 hafta. Aniq muddat texnik topshiriqdan keyin.",
      qRu: "Сколько времени займёт проект?",
      aRu: "Лендинг - 5-10 дней. Telegram-бот - 1-2 недели. CRM - 3-6 недель. Точный срок - после техзадания.",
    },
    {
      id: "faq-prepay",
      q: "Oldindan to'lov kerakmi?",
      a: "Ha, 50% oldindan, 50% topshirilganda. Yirik loyihalarda 3 bosqichli to'lov mumkin.",
      qRu: "Нужна ли предоплата?",
      aRu: "Да, 50% предоплата, 50% при сдаче. Для крупных проектов возможна оплата в 3 этапа.",
    },
    {
      id: "faq-domain",
      q: "Domen va hostingni o'zim olamanmi?",
      a: "Yo'q, men yordam beraman yoki o'zim sozlab beraman. Birinchi yil mening hisobimdan.",
      qRu: "Домен и хостинг покупать самому?",
      aRu: "Нет, я помогу или настрою сам. Первый год за мой счёт.",
    },
    {
      id: "faq-warranty",
      q: "Kafolat berasizmi?",
      a: "Ha. 30 kun davomida kodda bo'lgan har qanday xatoni bepul tuzataman.",
      qRu: "Даёте гарантию?",
      aRu: "Да. В течение 30 дней бесплатно исправляю любые ошибки в коде.",
    },
    {
      id: "faq-template",
      q: "Tayyor shablonlardan foydalanasizmi?",
      a: "Yo'q. Har bir loyiha noldan, sizning brendingiz va talablaringizga moslab yoziladi.",
      qRu: "Используете готовые шаблоны?",
      aRu: "Нет. Каждый проект пишется с нуля под ваш бренд и требования.",
    },
  ],
  settings: {
    orderMessageUz:
      "Assalomu alaykum! 👋 Sayt orqali yozyapman.\nMenga «{title}» xizmati kerak edi. Narxi va muddati haqida batafsil ma'lumot bera olasizmi?",
    orderMessageRu:
      "Здравствуйте! 👋 Пишу с вашего сайта.\nМеня интересует услуга «{title}». Подскажите, пожалуйста, цену и сроки?",
    calcAddons: [
      { key: "multilang", label: "Ko'p tillilik (UZ/RU)", price: 300000 },
      { key: "payment", label: "To'lov integratsiyasi (Click/Payme)", price: 500000 },
      { key: "admin", label: "Admin panel", price: 800000 },
      { key: "seo", label: "Kengaytirilgan SEO", price: 300000 },
    ],
  },
};

export const DEFAULT_SETTINGS = DEFAULT_SITE_DATA.settings;

function normalizeProject(project) {
  return { image: "", gallery: [], ...project };
}

function normalizeFaq(faq) {
  return { id: "", q: "", a: "", qRu: "", aRu: "", ...faq };
}

function normalizePost(post) {
  return { cover: "", published: true, tags: [], ...post };
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
    posts: Array.isArray(data?.posts) ? data.posts.map(normalizePost) : DEFAULT_SITE_DATA.posts,
    faqs: Array.isArray(data?.faqs) ? data.faqs.map(normalizeFaq) : DEFAULT_SITE_DATA.faqs,
    settings: { ...DEFAULT_SITE_DATA.settings, ...(data?.settings || {}) },
  };
}

/* ------------------------- private workspace (admin) ---------------------- */

export const DEFAULT_WORKSPACE = {
  clients: [],
  works: [],
  payments: [],
  tasks: [],
  notes: [],
};

export function normalizeWorkspace(data) {
  return {
    clients: Array.isArray(data?.clients) ? data.clients : [],
    works: Array.isArray(data?.works) ? data.works : [],
    payments: Array.isArray(data?.payments) ? data.payments : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
  };
}

export function normalizeLead(lead, index = 0) {
  return {
    id: lead.id || `lead-${lead.createdAt || index}`,
    status: lead.status || "new",
    name: lead.name || "",
    phone: lead.phone || "",
    service: lead.service || "",
    message: lead.message || "",
    createdAt: lead.createdAt || "",
  };
}

export function normalizeLeads(data) {
  return Array.isArray(data) ? data.map(normalizeLead) : [];
}

export async function fetchWorkspace(options = {}) {
  const response = await fetch(WORKSPACE_API_URL, {
    signal: options.signal,
    cache: "no-store",
    headers: { Accept: "application/json", "X-Admin-Password": options.password ?? "" },
  });
  if (!response.ok) throw new Error("Workspace could not be loaded");
  return normalizeWorkspace(await response.json());
}

export async function saveWorkspace(data, options = {}) {
  const normalized = normalizeWorkspace(data);
  const response = await fetch(WORKSPACE_API_URL, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Password": options.password ?? "",
    },
    body: JSON.stringify(normalized),
  });
  if (!response.ok) throw new Error("Workspace could not be saved");
  return normalizeWorkspace(await response.json());
}

export async function fetchLeads(options = {}) {
  const response = await fetch(LEADS_API_URL, {
    signal: options.signal,
    cache: "no-store",
    headers: { Accept: "application/json", "X-Admin-Password": options.password ?? "" },
  });
  if (!response.ok) throw new Error("Leads could not be loaded");
  return normalizeLeads(await response.json());
}

export async function saveLeads(leads, options = {}) {
  const normalized = normalizeLeads(leads);
  const response = await fetch(LEADS_API_URL, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Password": options.password ?? "",
    },
    body: JSON.stringify(normalized),
  });
  if (!response.ok) throw new Error("Leads could not be saved");
  return normalizeLeads(await response.json());
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

export async function uploadImage(dataUrl, options = {}) {
  const response = await fetch(UPLOAD_API_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Password": options.password ?? "",
    },
    body: JSON.stringify({ dataUrl }),
  });

  if (!response.ok) {
    throw new Error("Rasmni yuklab bo'lmadi");
  }

  const result = await response.json();
  return result.url;
}

export async function updateAdminCredentials({ login, password }, options = {}) {
  const response = await fetch(ADMIN_CREDENTIALS_API_URL, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Admin-Password": options.password ?? "",
    },
    body: JSON.stringify({ login, password }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Saqlab bo'lmadi");
  }

  return response.json();
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
