import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { UserRole } from "@/lib/enums";

/**
 * TOKENLAR
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ARXITEKTURA
 *
 *  Access token — JWT (HS256), qisqa umrli (15 daqiqa).
 *    Middleware uni STATELESS tekshiradi. Sababi: middleware Edge runtime'da
 *    ishlaydi, Edge'da esa Prisma ishlamaydi — har so'rovda databasega
 *    murojaat qilish imkoni yo'q. JWT o'zida rol va sessiya id'sini
 *    olib yuradi, shuning uchun tekshirish uchun DB kerak emas.
 *
 *  Refresh token — OPAQUE tasodifiy qiymat, JWT emas.
 *    Sababi: JWT'ni bekor qilib bo'lmaydi (u o'zini o'zi tasdiqlaydi).
 *    Opaque token esa databaseda yozuv sifatida yashaydi — uni o'chirsak
 *    darhol kuchini yo'qotadi. Sessiyani majburan yopish, qurilmani
 *    o'chirish va o'g'irlikni aniqlash shu tufayli ishlaydi.
 *
 *  Refresh token databaseda HMAC-SHA256 sifatida saqlanadi, oddiy SHA-256
 *  emas. Farqi muhim: oddiy hash bo'lsa, database o'g'irlangan hujumchi
 *  o'zida bor tokenning hashini hisoblab, yozuvni topib oladi. HMAC uchun
 *  esa maxfiy kalit ham kerak bo'ladi — u faqat serverda.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu modul `src/lib/env.ts` ni IMPORT QILMAYDI va `process.env` dan
 * to'g'ridan-to'g'ri o'qiydi. Sababi: u Edge runtime'dagi middleware'ga
 * tushadi, env.ts esa Zod schemasini o'zi bilan tortib keladi. Sozlamalar
 * to'g'riligini env.ts Node tomonida ishga tushishda tekshiradi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Muddat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "15m", "30d", "3600s" ko'rinishidagi muddatni SEKUNDga aylantiradi.
 *
 * Nega o'z parseri: `ms` kabi kutubxona qo'shish shu kichik vazifa uchun
 * ortiqcha, va format `.env` da qat'iy belgilangan.
 */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());

  if (!match) {
    throw new Error(
      `Muddat formati noto'g'ri: ${JSON.stringify(value)}. Kutilgan: 30s, 15m, 12h, 30d`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";

  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return amount * multiplier;
}

function readSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): Uint8Array {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} berilmagan yoki 32 belgidan qisqa. ` +
        `Yasash: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
  }

  return new TextEncoder().encode(value);
}

export const ACCESS_TOKEN_TTL_SECONDS = parseDuration(
  process.env.ACCESS_TOKEN_TTL || "15m"
);
export const REFRESH_TOKEN_TTL_SECONDS = parseDuration(
  process.env.REFRESH_TOKEN_TTL || "30d"
);

// ─────────────────────────────────────────────────────────────────────────────
// Access token (JWT)
// ─────────────────────────────────────────────────────────────────────────────

const ISSUER = "ozodflow";
const AUDIENCE = "ozodflow-app";

export type AccessTokenClaims = {
  /** Foydalanuvchi id */
  userId: string;
  role: UserRole;
  /** Sessiya id — chiqishda va o'g'irlikni aniqlashda kerak */
  sessionId: string;
};

/** JWT ichida saqlanadigan qisqa kalitlar (token hajmini kichik saqlash uchun). */
type AccessTokenPayload = JWTPayload & {
  role: string;
  sid: string;
};

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ role: claims.role, sid: claims.sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(readSecret("JWT_ACCESS_SECRET"));
}

/**
 * Access tokenni tekshiradi.
 *
 * Xato tashlamaydi — `null` qaytaradi. Sababi: muddati o'tgan token oddiy
 * holat, xato emas. Chaqiruvchi kod `null` ni ko'rib refresh qilishga
 * o'tadi yoki kirish sahifasiga yuboradi.
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify<AccessTokenPayload>(
      token,
      readSecret("JWT_ACCESS_SECRET"),
      {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"],
        // Server vaqtlari orasidagi kichik farqga yon berish
        clockTolerance: 5,
      }
    );

    if (!payload.sub || typeof payload.role !== "string" || typeof payload.sid !== "string") {
      return null;
    }

    // Rol qiymati bizga tanish bo'lishi kerak — token qo'lda yasalgan
    // bo'lsa yoki eski rol nomi qolgan bo'lsa ishonmaymiz.
    if (!Object.values(UserRole).includes(payload.role as UserRole)) {
      return null;
    }

    return {
      userId: payload.sub,
      role: payload.role as UserRole,
      sessionId: payload.sid,
    };
  } catch {
    // Muddati o'tgan, imzosi buzilgan yoki formati noto'g'ri.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh token (opaque)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Yangi refresh token yasaydi: 32 bayt (256 bit) tasodifiy qiymat.
 *
 * base64url — URL va cookie uchun xavfsiz, qo'shimcha kodlash kerak emas.
 */
export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  // Node'ning Buffer'i Edge'da yo'q, shuning uchun qo'lda base64url.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Refresh tokenni databaseda saqlash uchun HMAC-SHA256 hisoblaydi.
 *
 * `crypto.subtle` ishlatiladi — u Node'da ham, Edge'da ham bor.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    readSecret("JWT_REFRESH_SECRET"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Refresh token muddati tugash sanasi. */
export function refreshTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}
