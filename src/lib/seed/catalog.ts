import { db } from "@/lib/db";
import { sumToTiyin } from "@/lib/money";

/**
 * Xizmat kategoriyalari va ular ichidagi xizmatlar.
 *
 * Bu ma'lumot admin panelda tahrirlanadi — seed faqat BOSHLANG'ICH holatni
 * beradi, shunda yangi o'rnatilgan platforma bo'sh ko'rinmaydi.
 *
 * `upsert` ishlatiladi: seed qayta ishga tushirilsa mavjud yozuvlar
 * dublikat bo'lmaydi, lekin admin o'zgartirgan matnlar ham tiklanib
 * ketmasligi kerak — shuning uchun `update` da faqat texnik maydonlar
 * yangilanadi, nom va tavsif tegilmaydi.
 */

type ServiceSeed = {
  slug: string;
  title: string;
  description: string;
  /** Boshlang'ich narx, SO'MDA (tiyinga o'zi aylantiriladi) */
  basePrice: number;
  deliveryDays: number;
};

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  /** `src/components/icon.tsx` dagi ikonka nomi */
  icon: string;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  services: ServiceSeed[];
};

const CATEGORIES: CategorySeed[] = [
  {
    slug: "veb-saytlar",
    name: "Veb-saytlar",
    description: "Landing page, korporativ sayt, internet do'kon va veb-ilovalar.",
    icon: "Globe",
    isFeatured: true,
    seoTitle: "Veb-sayt yaratish — landing, korporativ sayt, internet do'kon",
    seoDescription:
      "Tekshirilgan developerlardan sayt buyurtma qiling. Landing page, " +
      "korporativ sayt, internet do'kon va veb-ilovalar. Escrow himoyasi bilan.",
    services: [
      {
        slug: "landing-page",
        title: "Landing page",
        description:
          "Bitta maqsadga qaratilgan sotuvchi sahifa: mahsulot taqdimoti, " +
          "ariza formasi, tez yuklanish va mobil moslashuv.",
        basePrice: 2_500_000,
        deliveryDays: 7,
      },
      {
        slug: "korporativ-sayt",
        title: "Korporativ sayt",
        description:
          "Kompaniya sayti: xizmatlar, portfolio, yangiliklar bo'limi va " +
          "kontent boshqaruv paneli.",
        basePrice: 6_000_000,
        deliveryDays: 21,
      },
      {
        slug: "internet-dokon",
        title: "Internet do'kon",
        description:
          "Katalog, savat, buyurtma va to'lov tizimi. Ombor hisobi va " +
          "sotuvchi paneli bilan.",
        basePrice: 12_000_000,
        deliveryDays: 35,
      },
      {
        slug: "veb-ilova",
        title: "Veb-ilova",
        description:
          "Brauzerda ishlaydigan murakkab tizim: foydalanuvchi rollari, " +
          "ma'lumot bazasi, hisobotlar va integratsiyalar.",
        basePrice: 20_000_000,
        deliveryDays: 45,
      },
    ],
  },
  {
    slug: "telegram-botlar",
    name: "Telegram botlar",
    description: "Buyurtma qabul qilish, to'lov, CRM va avtomatlashtirish botlari.",
    icon: "Bot",
    isFeatured: true,
    seoTitle: "Telegram bot yaratish — buyurtma, to'lov va CRM botlari",
    seoDescription:
      "Biznes uchun Telegram bot buyurtma qiling: buyurtma qabul qilish, " +
      "to'lov, mijozlar bazasi va avtomatik javoblar.",
    services: [
      {
        slug: "buyurtma-boti",
        title: "Buyurtma qabul qiluvchi bot",
        description:
          "Mahsulot katalogi, savat, buyurtma qabul qilish va adminga xabar. " +
          "Yetkazib berish manzilini xaritadan olish imkoni bilan.",
        basePrice: 3_000_000,
        deliveryDays: 10,
      },
      {
        slug: "tolov-boti",
        title: "To'lovli bot",
        description:
          "Click, Payme yoki Uzum orqali to'lov qabul qiluvchi bot. " +
          "Obuna va bir martalik to'lovlar.",
        basePrice: 5_000_000,
        deliveryDays: 14,
      },
      {
        slug: "crm-boti",
        title: "CRM va boshqaruv boti",
        description:
          "Xodimlar uchun ichki bot: vazifalar, hisobotlar, davomat va " +
          "ma'lumot bazasiga ulanish.",
        basePrice: 7_000_000,
        deliveryDays: 21,
      },
    ],
  },
  {
    slug: "mobil-ilovalar",
    name: "Mobil ilovalar",
    description: "Android va iOS uchun ilovalar — nativ yoki cross-platform.",
    icon: "Smartphone",
    isFeatured: true,
    seoTitle: "Mobil ilova yaratish — Android va iOS",
    seoDescription:
      "Android va iOS uchun mobil ilova buyurtma qiling. React Native, " +
      "Flutter yoki nativ ishlab chiqish.",
    services: [
      {
        slug: "cross-platform-ilova",
        title: "Cross-platform ilova",
        description:
          "Bitta kod bazasidan Android va iOS uchun ilova. Tezroq va " +
          "arzonroq yo'l — ko'p loyihalar uchun yetarli.",
        basePrice: 18_000_000,
        deliveryDays: 45,
      },
      {
        slug: "nativ-ilova",
        title: "Nativ ilova",
        description:
          "Platformaga to'liq moslashgan ilova: eng yaxshi ishlash tezligi " +
          "va qurilma imkoniyatlaridan to'liq foydalanish.",
        basePrice: 30_000_000,
        deliveryDays: 60,
      },
    ],
  },
  {
    slug: "ui-ux-dizayn",
    name: "UI/UX dizayn",
    description: "Interfeys dizayni, prototip va dizayn tizimi.",
    icon: "Figma",
    isFeatured: true,
    seoTitle: "UI/UX dizayn xizmati — sayt va mobil ilova interfeysi",
    seoDescription:
      "Professional UI/UX dizayn: sayt va ilova interfeysi, prototip, " +
      "dizayn tizimi. Figma'da tayyor maketlar.",
    services: [
      {
        slug: "sayt-dizayni",
        title: "Sayt dizayni",
        description:
          "Figma'da to'liq maket: barcha sahifalar, mobil versiya va " +
          "interaktiv prototip.",
        basePrice: 4_000_000,
        deliveryDays: 14,
      },
      {
        slug: "ilova-dizayni",
        title: "Mobil ilova dizayni",
        description:
          "Ilova ekranlari, navigatsiya oqimi, animatsiya ko'rsatmalari va " +
          "developerlar uchun spetsifikatsiya.",
        basePrice: 6_000_000,
        deliveryDays: 21,
      },
      {
        slug: "dizayn-tizimi",
        title: "Dizayn tizimi",
        description:
          "Qayta ishlatiladigan komponentlar kutubxonasi, rang va tipografiya " +
          "qoidalari. Jamoa bilan ishlash uchun.",
        basePrice: 9_000_000,
        deliveryDays: 28,
      },
    ],
  },
  {
    slug: "brend-va-grafika",
    name: "Brend va grafika",
    description: "Logotip, brendbuk, ijtimoiy tarmoq va matbaa grafikasi.",
    icon: "Brush",
    isFeatured: true,
    seoTitle: "Logotip va brend identifikatsiyasi yaratish",
    seoDescription:
      "Logotip, brendbuk, vizitka va ijtimoiy tarmoq grafikasi. " +
      "Brendingizni professional ko'rinishga keltiring.",
    services: [
      {
        slug: "logotip",
        title: "Logotip",
        description:
          "Bir necha variant, tanlanganini barcha formatlarda yetkazish " +
          "(SVG, PNG, oq-qora versiya).",
        basePrice: 1_500_000,
        deliveryDays: 7,
      },
      {
        slug: "brendbuk",
        title: "Brendbuk",
        description:
          "Logotipdan foydalanish qoidalari, rang palitrasi, shriftlar va " +
          "namunalar to'plami.",
        basePrice: 5_000_000,
        deliveryDays: 21,
      },
      {
        slug: "smm-grafika",
        title: "Ijtimoiy tarmoq grafikasi",
        description:
          "Instagram va Telegram uchun post shablonlari, stories va " +
          "kanal bezaklari.",
        basePrice: 1_200_000,
        deliveryDays: 7,
      },
    ],
  },
  {
    slug: "seo-va-marketing",
    name: "SEO va marketing",
    description: "Qidiruv optimizatsiyasi, kontent strategiya va reklama.",
    icon: "Search",
    isFeatured: true,
    seoTitle: "SEO xizmati va raqamli marketing",
    seoDescription:
      "Saytni Google'da yuqoriga chiqarish, SEO audit, kontent strategiya " +
      "va ijtimoiy tarmoqlarda targ'ibot.",
    services: [
      {
        slug: "seo-audit",
        title: "SEO audit",
        description:
          "Saytning texnik holati, kalit so'zlar tahlili va aniq " +
          "tuzatishlar ro'yxati.",
        basePrice: 2_000_000,
        deliveryDays: 10,
      },
      {
        slug: "seo-optimizatsiya",
        title: "SEO optimizatsiya",
        description:
          "Texnik tuzatishlar, kontent optimizatsiyasi va natijalarni " +
          "oylik kuzatish.",
        basePrice: 4_000_000,
        deliveryDays: 30,
      },
      {
        slug: "smm-boshqaruv",
        title: "SMM boshqaruv",
        description:
          "Kontent rejasi, post yozish va dizayni, obunachilar bilan " +
          "ishlash.",
        basePrice: 3_500_000,
        deliveryDays: 30,
      },
    ],
  },
  {
    slug: "avtomatlashtirish-crm",
    name: "Avtomatlashtirish va CRM",
    description: "CRM tizimlar, integratsiyalar va ish jarayonlarini avtomatlashtirish.",
    icon: "Workflow",
    isFeatured: false,
    seoTitle: "CRM tizim va biznes jarayonlarini avtomatlashtirish",
    seoDescription:
      "Mijozlar bazasi, sotuv voronkasi, hisobotlar va tizimlar orasidagi " +
      "integratsiya. Qo'l mehnatini kamaytiring.",
    services: [
      {
        slug: "crm-tizim",
        title: "CRM tizim",
        description:
          "Mijozlar bazasi, sotuv bosqichlari, vazifalar va hisobotlar. " +
          "Biznes jarayoningizga moslashtirilgan.",
        basePrice: 15_000_000,
        deliveryDays: 40,
      },
      {
        slug: "integratsiya",
        title: "Tizimlar integratsiyasi",
        description:
          "Mavjud tizimlarni bir-biriga ulash: sayt, CRM, ombor, " +
          "buxgalteriya va to'lov tizimlari.",
        basePrice: 6_000_000,
        deliveryDays: 21,
      },
      {
        slug: "hisobot-tizimi",
        title: "Hisobot va dashboard",
        description:
          "Ma'lumotlarni bir joyga yig'ib, real vaqtda ko'rsatadigan " +
          "boshqaruv paneli.",
        basePrice: 8_000_000,
        deliveryDays: 25,
      },
    ],
  },
  {
    slug: "ai-yechimlar",
    name: "AI yechimlar",
    description: "Chatbot, matn va ma'lumot tahlili, hujjat avtomatlashtirish.",
    icon: "BrainCircuit",
    isFeatured: false,
    seoTitle: "AI yechimlar — chatbot va ma'lumot tahlili",
    seoDescription:
      "Sun'iy intellekt yechimlarini biznesga joriy qilish: aqlli chatbot, " +
      "hujjatlarni avtomatik qayta ishlash, ma'lumot tahlili.",
    services: [
      {
        slug: "aqlli-chatbot",
        title: "Aqlli chatbot",
        description:
          "Mijoz savollariga o'z bazangiz asosida javob beradigan bot. " +
          "Sayt yoki Telegram uchun.",
        basePrice: 8_000_000,
        deliveryDays: 21,
      },
      {
        slug: "hujjat-avtomatlashtirish",
        title: "Hujjat avtomatlashtirish",
        description:
          "Skanerlangan hujjatlardan ma'lumot ajratib olish va tizimga " +
          "kiritishni avtomatlashtirish.",
        basePrice: 10_000_000,
        deliveryDays: 28,
      },
    ],
  },
];

export async function seedCatalog(): Promise<{ categories: number; services: number }> {
  let categoryCount = 0;
  let serviceCount = 0;

  for (const [index, category] of CATEGORIES.entries()) {
    const record = await db.category.upsert({
      where: { slug: category.slug },
      // Mavjud bo'lsa faqat tartib va faollikni tiklaymiz — admin
      // o'zgartirgan nom va tavsif saqlanadi.
      update: {
        sortOrder: index,
        isActive: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        isFeatured: category.isFeatured,
        sortOrder: index,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
      },
      select: { id: true },
    });

    categoryCount += 1;

    for (const [serviceIndex, service] of category.services.entries()) {
      await db.service.upsert({
        where: { slug: service.slug },
        update: {
          sortOrder: serviceIndex,
          isActive: true,
          categoryId: record.id,
        },
        create: {
          slug: service.slug,
          categoryId: record.id,
          title: service.title,
          description: service.description,
          basePrice: sumToTiyin(service.basePrice),
          deliveryDays: service.deliveryDays,
          sortOrder: serviceIndex,
        },
      });

      serviceCount += 1;
    }
  }

  return { categories: categoryCount, services: serviceCount };
}
