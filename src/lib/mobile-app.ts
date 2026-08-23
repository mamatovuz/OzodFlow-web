import { prisma } from "./prisma";

/**
 * Mobil ilova ("shell") yordamchi funksiyalari.
 *
 * OzodFlow mobil ilovasi — kichik Android WebView "shell": ilovani ochganda
 * ozodflow.uz/m/<slug> menyusi ilova ichida ochiladi (browser ko'rinmaydi).
 * Menyu/narx/dizayn serverdan yangilanadi — APK'ni qayta build qilish shart emas.
 * Faqat nom/ikonka/rang/paket o'zgarsa yangi versiya kerak.
 *
 * ⚠️ Haqiqiy imzolangan .apk faylini yaratish Android SDK (Bubblewrap/TWA) talab
 * qiladi — bu tashqi build xizmatida bajariladi. `MOBILE_APP_BUILD_URL` env
 * o'rnatilsa, build so'rovi o'sha xizmatga yuboriladi. Aks holda ilova PWA
 * ("Bosh ekranga qo'shish") sifatida o'rnatiladi — bu ham to'liq ishlaydigan,
 * browsersiz standalone ilova.
 */

/** slug'dan Android paket nomi: uz.ozodflow.<sanitized> */
export function packageNameFor(slug: string): string {
  let seg = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!seg) seg = "app";
  if (/^[0-9]/.test(seg)) seg = "a" + seg; // segment raqamdan boshlanmasin
  return `uz.ozodflow.${seg}`;
}

/** Taxminiy APK hajmi (shell WebView ~ 6–9 MB). Nom uzunligiga qarab barqaror. */
export function estimateApkSize(appName: string): string {
  const base = 6.8 + (appName.length % 20) * 0.08;
  return `${base.toFixed(1)} MB`;
}

/**
 * Restoran uchun mobil ilova sozlamasini oladi, yo'q bo'lsa default bilan yaratadi.
 */
export async function getOrCreateMobileApp(restaurant: {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
}) {
  const existing = await prisma.mobileApp.findUnique({
    where: { restaurantId: restaurant.id },
  });
  if (existing) return existing;

  return prisma.mobileApp.create({
    data: {
      restaurantId: restaurant.id,
      appName: restaurant.name,
      packageName: packageNameFor(restaurant.slug),
      themeColor: restaurant.primaryColor || "#2563EB",
    },
  });
}

export const isBuildServiceConfigured = () => !!process.env.MOBILE_APP_BUILD_URL;
