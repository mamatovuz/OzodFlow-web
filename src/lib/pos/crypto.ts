/**
 * POS hisob ma'lumotlarini shifrlash (AES-256-GCM).
 * Kalitlar (API key, secret) DB'da HECH QACHON ochiq saqlanmaydi.
 *
 * Kalit manbai: `POS_ENCRYPTION_KEY` (32 baytlik hex/base64) yoki mavjud
 * bo'lmasa `JWT_SECRET` dan SHA-256 orqali olinadi (dev qulayligi uchun).
 * Ishlab chiqarishda alohida `POS_ENCRYPTION_KEY` o'rnatilishi tavsiya etiladi.
 */
import crypto from "crypto";

function getKey(): Buffer {
  const raw = process.env.POS_ENCRYPTION_KEY;
  if (raw) {
    // hex (64 belgi) yoki base64 bo'lishi mumkin
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
    // aks holda xom satrdan hosil qilamiz
    return crypto.createHash("sha256").update(raw).digest();
  }
  const fallback = process.env.JWT_SECRET || "ozodflow-dev-secret-change-me";
  return crypto.createHash("sha256").update(`pos:${fallback}`).digest();
}

/** Obyektni shifrlab, saqlash uchun bitta satr qaytaradi (v1:iv:tag:data) */
export function encryptCredentials(data: Record<string, string>): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

/** Shifrlangan satrni ochib, obyektni qaytaradi */
export function decryptCredentials(payload: string): Record<string, string> {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("POS credentials format noto'g'ri");
  }
  const key = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

/** UI'ga qaytarish uchun maxfiy qiymatlarni niqoblaydi (••••1234) */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}
