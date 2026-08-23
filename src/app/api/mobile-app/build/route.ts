import { prisma } from "@/lib/prisma";
import { route, ok, fail, authGuard, getUserRestaurant } from "@/lib/api";
import {
  getOrCreateMobileApp,
  estimateApkSize,
  isCiBuildConfigured,
  dispatchApkBuild,
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

  // ── Haqiqiy APK build (GitHub Actions) ────────────────────────────────
  if (isCiBuildConfigured()) {
    await prisma.mobileApp.update({
      where: { restaurantId: restaurant.id },
      data: { status: "BUILDING", version: { increment: 1 } },
    });

    const dispatch = await dispatchApkBuild({
      slug: restaurant.slug,
      appName: current.appName,
      packageName: current.packageName,
      themeColor: current.themeColor,
    });

    if (!dispatch.ok) {
      log.error("mobile_app_dispatch", { err: dispatch.error });
      const app = await prisma.mobileApp.update({
        where: { restaurantId: restaurant.id },
        data: { status: "FAILED" },
      });
      return fail(
        "Ilovani qurishni boshlab bo'lmadi. Birozdan so'ng qayta urining.",
        502,
        { app }
      );
    }

    // BUILDING holatida qoladi — GitHub Actions tugagach `/api/mobile-app/upload`
    // orqali status READY + apkUrl o'rnatiladi (dashboard polling bilan kuzatadi).
    const app = await prisma.mobileApp.findUnique({
      where: { restaurantId: restaurant.id },
    });
    return ok({ app, building: true, ci: true });
  }

  // ── CI sozlanmagan: PWA rejimi (ulashish sahifasi orqali o'rnatiladi) ──
  const app = await prisma.mobileApp.update({
    where: { restaurantId: restaurant.id },
    data: {
      status: "READY",
      version: { increment: 1 },
      apkSize: estimateApkSize(current.appName),
      lastBuiltAt: new Date(),
    },
  });

  return ok({ app, building: false, ci: false });
});
