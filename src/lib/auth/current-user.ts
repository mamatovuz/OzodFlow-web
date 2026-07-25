import { redirect } from "next/navigation";
import { cache } from "react";

import { readAccessToken } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { UserRole, UserStatus, hasRole, isAdminRole } from "@/lib/enums";

/**
 * SERVER TOMONIDA HOZIRGI FOYDALANUVCHI
 *
 * Middleware faqat tokenning imzosi va muddatini tekshiradi (Edge'da
 * database yo'q). HAQIQIY RUXSAT esa shu yerda beriladi:
 *
 *   • foydalanuvchi hali ham mavjudmi (o'chirilmaganmi)
 *   • hisobi bloklanmaganmi
 *   • roli tokendagi rolga mos keladimi — admin roli tortib olingan bo'lsa,
 *     eski token bilan admin panelga kirib qolmasin
 *
 * Ya'ni token "kim ekanligini" aytadi, database "hozir nima qila olishini"
 * aytadi. Ikkinchisi ustun.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * Next.js'ning `forbidden()` / `unauthorized()` funksiyalari ATAYLAB
 * ishlatilmadi: ular Next 16'da ham `experimental.authInterrupts`
 * bayrog'ini talab qiladi. Asosiy avtorizatsiya mexanizmini experimental
 * API'ga bog'lash — keyingi versiyada buzilish xavfi. Buning o'rniga
 * oddiy `redirect()` va aniq `/403` sahifasi ishlatiladi.
 * ───────────────────────────────────────────────────────────────────────────
 */

export type CurrentUser = {
  id: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  status: string;
  locale: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  /** Hozirgi sessiya id — chiqish va "bu qurilma" belgisi uchun */
  sessionId: string;
};

/**
 * `cache()` — bitta so'rov ichida natija bir marta hisoblanadi.
 *
 * Nega muhim: `getCurrentUser()` layout'da, sahifada va bir necha
 * komponentda chaqiriladi. Keshsiz bo'lsa har chaqiruv alohida DB so'rovi
 * bo'lardi — bitta sahifani chizish uchun 5-10 ta keraksiz so'rov.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readAccessToken();
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      name: true,
      avatarUrl: true,
      role: true,
      status: true,
      locale: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      twoFactorEnabled: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return null;

  // Bloklangan hisob — token amal qilsa ham kirish yo'q.
  if (user.status === UserStatus.BANNED || user.status === UserStatus.DELETED) {
    return null;
  }

  // Sessiya tirikligi HAR SAHIFADA tekshirilmaydi.
  //
  // Sababi: bu qo'shimcha DB so'rovi bo'ladi, foyda esa kichik — access
  // token 15 daqiqada tugaydi, ya'ni bekor qilingan sessiya eng ko'p
  // 15 daqiqa yashaydi. Refresh paytida sessiya albatta tekshiriladi
  // (`rotateSession`), darhol chiqarish kerak bo'lgan holatlar esa
  // `status` maydoni orqali yuqorida ushlanadi.

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role as UserRole,
    status: user.status,
    locale: user.locale,
    emailVerified: user.emailVerifiedAt !== null,
    phoneVerified: user.phoneVerifiedAt !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    sessionId: claims.sessionId,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Sahifalar uchun: ruxsat bo'lmasa boshqa sahifaga yuboradi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Foydalanuvchi kirgan bo'lishi SHART. Aks holda kirish sahifasiga yuboradi.
 *
 * `returnTo` bilan — kirgandan keyin o'zi turgan sahifaga qaytadi.
 */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }

  return user;
}

/**
 * Kamida berilgan rol talab qilinadi.
 *
 * Ierarxiya `ROLE_RANK` bo'yicha: SUPER_ADMIN barcha ADMIN sahifalariga
 * kiradi, teskarisi emas.
 */
export async function requireRole(
  role: UserRole,
  returnTo?: string
): Promise<CurrentUser> {
  const user = await requireUser(returnTo);

  if (!hasRole(user.role, role)) {
    // Kirish sahifasiga YUBORMAYMIZ: foydalanuvchi allaqachon kirgan,
    // shunchaki huquqi yetmaydi. "Kirish" sahifasi chalg'itardi.
    redirect("/403");
  }

  return user;
}

/** ADMIN yoki SUPER_ADMIN talab qiladi. */
export async function requireAdmin(returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);

  if (!isAdminRole(user.role)) {
    redirect("/403");
  }

  return user;
}

/** Faqat SUPER_ADMIN — komissiya, rollar va tizim sozlamalari uchun. */
export async function requireSuperAdmin(returnTo?: string): Promise<CurrentUser> {
  return requireRole(UserRole.SUPER_ADMIN, returnTo);
}

/**
 * Tasdiqlangan developer talab qiladi.
 *
 * DEVELOPER roli YETARLI EMAS — ariza tasdiqlangan (`verifiedAt`) bo'lishi
 * ham kerak. Aks holda ko'rikda turgan foydalanuvchi loyiha qabul qilib
 * qo'yishi mumkin edi.
 */
export async function requireVerifiedDeveloper(
  returnTo?: string
): Promise<CurrentUser & { developerProfileId: string }> {
  const user = await requireUser(returnTo);

  if (user.role !== UserRole.DEVELOPER && !isAdminRole(user.role)) {
    redirect("/403");
  }

  const profile = await db.developerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, verifiedAt: true },
  });

  if (!profile?.verifiedAt) {
    // Ariza holati sahifasi 403 dan foydaliroq: u nima qilish kerakligini
    // ko'rsatadi.
    redirect("/apply/status");
  }

  return { ...user, developerProfileId: profile.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server action'lar uchun: redirect emas, natija qaytaradi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Action'lar `redirect` QILMASLIGI kerak: forma yuborilganda sahifa
 * kutilmaganda almashib ketadi va foydalanuvchi nima bo'lganini bilmaydi.
 * Buning o'rniga xato qaytariladi va formada xabar ko'rsatiladi.
 */
export type AuthzResult<T> =
  | { ok: true; user: T }
  | { ok: false; error: string; code: "UNAUTHENTICATED" | "FORBIDDEN" };

export async function authorizeAction(
  minimumRole?: UserRole
): Promise<AuthzResult<CurrentUser>> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      error: "Bu amal uchun tizimga kirish kerak.",
    };
  }

  if (minimumRole && !hasRole(user.role, minimumRole)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      error: "Bu amalni bajarish uchun huquqingiz yetarli emas.",
    };
  }

  return { ok: true, user };
}
