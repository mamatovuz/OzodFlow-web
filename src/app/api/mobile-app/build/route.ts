import { prisma } from "@/lib/prisma";
import { route, ok, fail, authGuard, getUserRestaurant } from "@/lib/api";
import {
  getOrCreateMobileApp,
  estimateApkSize,
  isBuildServiceConfigured,
} from "@/lib/mobile-app";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ilovani "yaratish" (build). Nom/ikonka/rang o'zgarganда yangi versiya tayyorlaydi.
// Menyu/narx serverdan yangilanadi — ular uchun qayta build shart emas.
export const POST = route(async () => {
  const { user, res } = await authGuard();
  if (res) return res;

  const restaurant = await getUserRestaurant(user!.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const current = await getOrCreateMobileApp(restaurant);

  // BUILDING holatini belgilaymiz
  await prisma.mobileApp.update({
    where: { restaurantId: restaurant.id },
    data: { status: "BUILDING" },
  });

  let apkUrl: string | null = current.apkUrl;

  // Tashqi build xizmati ulangan bo'lsa — unga so'rov yuboramiz (best-effort).
  if (isBuildServiceConfigured()) {
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || "https://ozodflow.uz";
      const r = await fetch(process.env.MOBILE_APP_BUILD_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: current.appName,
          packageName: current.packageName,
          themeColor: current.themeColor,
          startUrl: `${base}/m/${restaurant.slug}?source=app`,
          iconUrl: `${base}/m/${restaurant.slug}/app-icon?s=512`,
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.apkUrl) apkUrl = j.apkUrl as string;
    } catch (e) {
      log.error("mobile_app_build", { err: e instanceof Error ? e.message : String(e) });
    }
  }

  // READY — versiyani oshiramiz, hajm/vaqtni yozamiz.
  const app = await prisma.mobileApp.update({
    where: { restaurantId: restaurant.id },
    data: {
      status: "READY",
      version: { increment: 1 },
      apkUrl,
      apkSize: estimateApkSize(current.appName),
      lastBuiltAt: new Date(),
    },
  });

  return ok({ app, buildService: isBuildServiceConfigured() });
});
