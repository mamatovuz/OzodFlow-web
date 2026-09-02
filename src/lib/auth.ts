import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { deviceFingerprint } from "./device";
import { parseAdminPerms } from "./admin-perms";
import { encryptCredentials, decryptCredentials } from "./pos/crypto";

/**
 * JWT maxfiy kaliti. Ishlab chiqarishda `JWT_SECRET` MAJBURIY —
 * yo'q bo'lsa tokenlar qalbakilashtirilishi mumkin. Shuning uchun prod'da
 * yo'qligida xato tashlaymiz (lazy — build'ni buzmasligi uchun so'rov vaqtida).
 */
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET o'rnatilmagan — ishlab chiqarishda majburiy. Railway env'ga uzun tasodifiy satr qo'shing."
      );
    }
    cachedSecret = new TextEncoder().encode("ozodflow-dev-secret-change-me");
    return cachedSecret;
  }
  cachedSecret = new TextEncoder().encode(s);
  return cachedSecret;
}
const COOKIE = "ozodflow_session";
// Admin "parolsiz kirganda" — o'zining asl sessiya tokeni shu cookie'da saqlanadi,
// "Adminga qaytish"da qaytariladi.
const RETURN_COOKIE = "ozf_imp_return";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatar: string | null;
  isSuperAdmin: boolean;
  adminPerms: string[] | null; // qo'shimcha admin ruxsatlari (JSON'dan)
  impersonatedBy: string | null; // admin "parolsiz kirgan" bo'lsa — o'sha admin ID si
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Admin panelida restoran egasining parolini ko'rsatish uchun ochiq parolni
 * qaytariluvchi (AES-GCM) ko'rinishda shifrlaydi. bcrypt hash orqaga
 * qaytmagani sababli parolni register/login vaqtida shu yerda saqlaymiz.
 * Kalit — POS shifrlash bilan bir xil manba (POS_ENCRYPTION_KEY/JWT_SECRET).
 */
export function encryptPasswordPlain(password: string): string {
  return encryptCredentials({ p: password });
}

/** Shifrlangan parolni ochadi; xato bo'lsa null. */
export function decryptPasswordPlain(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return decryptCredentials(enc).p ?? null;
  } catch {
    return null;
  }
}

async function signToken(payload: { sub: string; sid: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string }
) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const tokenId = crypto.randomUUID();
  const jwt = await signToken({ sub: userId, sid: tokenId });

  // Muddati o'tgan sessiyalarni tozalaymiz (jadval cheksiz o'smasligi uchun)
  await prisma.session
    .deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
    .catch(() => {});

  await prisma.session.create({
    data: {
      id: tokenId,
      userId,
      token: jwt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
      deviceId: deviceFingerprint(meta?.userAgent),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(COOKIE);
}

// lastSeenAt'ni har so'rovda emas, faqat 2 daqiqadan oshsa yangilaymiz (yozuvni tejaymiz)
const LAST_SEEN_THROTTLE_MS = 2 * 60 * 1000;

async function loadSession(): Promise<{ user: SessionUser; sessionId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sid = payload.sid as string;

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) return null;

    // Qurilma egasi tomonidan bloklanganmi? Bloklangan bo'lsa — darhol chiqarib yuboramiz.
    if (session.deviceId) {
      const blocked = await prisma.blockedDevice
        .findUnique({
          where: { userId_fingerprint: { userId: session.userId, fingerprint: session.deviceId } },
        })
        .catch(() => null);
      if (blocked) {
        await prisma.session.delete({ where: { id: sid } }).catch(() => {});
        return null;
      }
    }

    // Oxirgi faollikni throttled yangilaymiz
    if (Date.now() - new Date(session.lastSeenAt).getTime() > LAST_SEEN_THROTTLE_MS) {
      prisma.session
        .update({ where: { id: sid }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        role: session.user.role,
        avatar: session.user.avatar,
        isSuperAdmin: session.user.isSuperAdmin,
        adminPerms: parseAdminPerms(session.user.adminPerms),
        impersonatedBy: session.impersonatedBy ?? null,
      },
      sessionId: sid,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await loadSession();
  return s?.user ?? null;
}

/** Joriy sessiya ID'si — "Faol seanslar" ro'yxatida shu qurilmani belgilash uchun. */
export async function getCurrentSessionId(): Promise<string | null> {
  const s = await loadSession();
  return s?.sessionId ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/**
 * Admin foydalanuvchi paneliga "parolsiz kiradi" (impersonation).
 * Adminning asl sessiya tokeni RETURN_COOKIE'ga saqlanadi (keyin qaytarish uchun),
 * so'ng target foydalanuvchi uchun impersonatedBy belgilangan yangi sessiya ochiladi.
 */
export async function createImpersonationSession(
  targetUserId: string,
  adminUserId: string,
  meta?: { userAgent?: string; ip?: string }
) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(COOKIE)?.value;

  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const tokenId = crypto.randomUUID();
  const jwt = await signToken({ sub: targetUserId, sid: tokenId });

  await prisma.session.create({
    data: {
      id: tokenId,
      userId: targetUserId,
      token: jwt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
      deviceId: deviceFingerprint(meta?.userAgent),
      impersonatedBy: adminUserId,
      expiresAt,
    },
  });

  // Adminning asl tokenini saqlaymiz (qaytish uchun)
  if (adminToken) {
    cookieStore.set(RETURN_COOKIE, adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }
  // Asosiy sessiyani target foydalanuvchiga almashtiramiz
  cookieStore.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * "Ortga qaytish" — impersonation sessiyasini yopib, asl (admin yoki egasi)
 * sessiyasini tiklaydi. Tiklangan foydalanuvchi rolini qaytaradi (yo'naltirish
 * uchun); tiklab bo'lmasa null. (Impersonation sessiyasidan chaqiriladi.)
 */
export async function stopImpersonation(): Promise<{ role: string } | null> {
  const cookieStore = await cookies();
  const returnToken = cookieStore.get(RETURN_COOKIE)?.value;
  if (!returnToken) return null;

  // Tiklanadigan foydalanuvchi rolini aniqlaymiz (yo'naltirish uchun)
  let role = "OWNER";
  try {
    const { payload } = await jwtVerify(returnToken, getSecret());
    const session = await prisma.session.findUnique({
      where: { id: payload.sid as string },
      include: { user: { select: { role: true } } },
    });
    if (session?.user) role = session.user.role;
  } catch {
    /* eski token — default OWNER */
  }

  // Joriy (impersonation) sessiyani DB'dan tozalaymiz
  const current = cookieStore.get(COOKIE)?.value;
  if (current) {
    await prisma.session.deleteMany({ where: { token: current } }).catch(() => {});
  }

  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  cookieStore.set(COOKIE, returnToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  cookieStore.delete(RETURN_COOKIE);
  return { role };
}
