import path from "path";
import { prisma } from "./prisma";
import { UPLOAD_DIR } from "./uploads";

/**
 * Mobil ilova ("shell") yordamchi funksiyalari.
 *
 * OzodFlow mobil ilovasi — kichik Android WebView/TWA "shell": ilovani ochganda
 * <domen>/m/<slug> menyusi ilova ichida (browsersiz) ochiladi.
 * Menyu/narx/dizayn serverdan yangilanadi — APK'ni qayta build qilish shart emas.
 * Faqat nom/ikonka/rang/paket o'zgarsa yangi versiya kerak.
 *
 * ✅ Haqiqiy imzolangan .apk GitHub Actions'da quriladi (bubblewrap/TWA):
 *   1. Egasi "Ilova yaratish" bosadi → server `workflow_dispatch` yuboradi.
 *   2. GitHub runner (JDK + Android SDK oldindan bor) APK ni quradi va imzolaydi.
 *   3. Workflow tayyor APK ni `/api/mobile-app/upload` ga qaytaradi.
 *   4. Server APK ni volume'ga saqlaydi, status = READY, apkUrl beriladi.
 *
 * Sozlanmasa (env yo'q) — ilova PWA ("Bosh ekranga qo'shish") sifatida
 * o'rnatiladi; bu ham to'liq ishlaydigan, browsersiz standalone ilova.
 */

/** slug'dan Android paket nomi: uz.ozodflow.<sanitized> */
export function packageNameFor(slug: string): string {
  let seg = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!seg) seg = "app";
  if (/^[0-9]/.test(seg)) seg = "a" + seg; // segment raqamdan boshlanmasin
  return `uz.ozodflow.${seg}`;
}

/** Baytlarni odam o'qiy oladigan formatga ("7.4 MB") aylantiradi. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/** Taxminiy APK hajmi (haqiqiy build bo'lmaguncha ko'rsatiladi). */
export function estimateApkSize(appName: string): string {
  const base = 6.8 + (appName.length % 20) * 0.08;
  return `${base.toFixed(1)} MB`;
}

/** Saqlangan APK fayl yo'li (UPLOAD_DIR/apk/<slug>.apk). */
export function apkFilePath(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return path.join(UPLOAD_DIR, "apk", `${safe}.apk`);
}

/** Ommaviy yuklab olish havolasi (o'z domenimizdan xizmat qilinadi). */
export function apkDownloadUrl(slug: string): string {
  return `/api/mobile-app/download/${slug}`;
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

/** Ommaviy asosiy manzil (callback/icon/start URL'lar uchun to'liq domen). */
export function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://ozodflow.uz"
  ).replace(/\/$/, "");
}

/** GitHub Actions build pipeline sozlanganmi? */
export function isCiBuildConfigured(): boolean {
  return !!(process.env.GITHUB_REPO && process.env.GH_DISPATCH_TOKEN);
}

/**
 * Ilova nomini xavfsiz qiladi — workflow input → shell heredoc → JSON zanjiriда
 * `"` / `\` / `$` / backtick / boshqaruv belgilari buzilish yoki injection
 * keltirmasligi uchun. Harflar (istalgan til), raqam, bo'shliq va oddiy tinish.
 */
export function sanitizeAppName(name: string): string {
  const cleaned = (name || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ") // boshqaruv belgilari
    .replace(/["\\$`]/g, "") // JSON/shell uchun xavfli
    .replace(/[^\p{L}\p{N} .,'’&()\-]/gu, "") // faqat xavfsiz to'plam
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
  return cleaned || "Menyu";
}

/**
 * GitHub Actions'ga APK build so'rovini yuboradi (workflow_dispatch).
 * Muvaffaqiyatli bo'lsa true qaytaradi. Xato bo'lsa false (chaqiruvchi
 * PWA rejimiga tushadi yoki xato ko'rsatadi).
 */
export async function dispatchApkBuild(input: {
  slug: string;
  appName: string;
  packageName: string;
  themeColor: string;
}): Promise<{ ok: boolean; error?: string }> {
  const repo = process.env.GITHUB_REPO; // "mamatovuz/OzodFlow-web"
  const token = process.env.GH_DISPATCH_TOKEN;
  const secret = process.env.APK_BUILD_SECRET || "";
  if (!repo || !token) return { ok: false, error: "CI sozlanmagan" };

  const branch = process.env.GITHUB_BRANCH || "main";
  const workflow = process.env.GITHUB_WORKFLOW_FILE || "build-apk.yml";
  const base = publicBaseUrl();
  const host = base.replace(/^https?:\/\//, "");

  try {
    const r = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "ozodflow-app-builder",
        },
        body: JSON.stringify({
          ref: branch,
          inputs: {
            slug: input.slug,
            appName: sanitizeAppName(input.appName),
            packageName: input.packageName,
            themeColor: /^#[0-9a-fA-F]{6}$/.test(input.themeColor)
              ? input.themeColor
              : "#2563EB",
            host,
            startPath: `/m/${input.slug}?source=app`,
            iconUrl: `${base}/m/${input.slug}/app-icon?s=512`,
            callbackUrl: `${base}/api/mobile-app/upload?slug=${encodeURIComponent(
              input.slug
            )}&secret=${encodeURIComponent(secret)}`,
          },
        }),
      }
    );
    if (r.status === 204) return { ok: true };
    const text = await r.text().catch(() => "");
    return { ok: false, error: `GitHub ${r.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const isBuildServiceConfigured = isCiBuildConfigured;
