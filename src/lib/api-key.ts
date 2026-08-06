/**
 * Hamkor (tashqi) API kalitlari — /api/v1 endpointlari uchun.
 * To'liq kalit foydalanuvchiga FAQAT bir marta (yaratilganda) ko'rsatiladi;
 * bazada faqat SHA-256 hash saqlanadi. Tekshiruv doimiy vaqtli (timing-safe).
 */
import crypto from "crypto";
import { prisma } from "./prisma";

const PREFIX = "ozf_live_";
const LOOKUP_LEN = 20; // prefix + boshlang'ich belgilar (tez qidiruv uchun)

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Yangi kalit yaratadi. To'liq kalitni QAYTARADI (faqat shu safar ko'rinadi). */
export async function createApiKey(
  restaurantId: string,
  name: string,
  scopes = "menu:read"
): Promise<{ id: string; key: string; prefix: string }> {
  const secret = crypto.randomBytes(24).toString("base64url");
  const fullKey = PREFIX + secret;
  const prefix = fullKey.slice(0, LOOKUP_LEN);
  const rec = await prisma.apiKey.create({
    data: { restaurantId, name, prefix, hash: sha256(fullKey), scopes },
  });
  return { id: rec.id, key: fullKey, prefix };
}

/**
 * Kiruvchi kalitni tekshiradi. To'g'ri bo'lsa restaurantId va scopes qaytaradi.
 * `lastUsedAt` yangilanadi (fon rejimda).
 */
export async function verifyApiKey(
  raw: string | null | undefined
): Promise<{ restaurantId: string; scopes: string; keyId: string } | null> {
  if (!raw || !raw.startsWith(PREFIX)) return null;
  const prefix = raw.slice(0, LOOKUP_LEN);
  const rec = await prisma.apiKey.findFirst({
    where: { prefix, isActive: true },
  });
  if (!rec) return null;

  const expected = Buffer.from(rec.hash, "hex");
  const got = Buffer.from(sha256(raw), "hex");
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
    return null;
  }

  // Oxirgi ishlatilgan vaqtni yangilaymiz (bloklamaymiz)
  prisma.apiKey
    .update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { restaurantId: rec.restaurantId, scopes: rec.scopes, keyId: rec.id };
}

/** Authorization: Bearer <key> yoki X-Api-Key headeridan kalitni oladi. */
export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}
