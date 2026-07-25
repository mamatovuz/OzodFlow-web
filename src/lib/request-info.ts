import { headers } from "next/headers";

/**
 * So'rov haqidagi ma'lumot: IP va User-Agent.
 *
 * Audit log, rate limiting va sessiya yozuvlarida ishlatiladi.
 */

export type RequestInfo = {
  ip: string | null;
  userAgent: string | null;
};

/**
 * Klient IP manzilini aniqlaydi.
 *
 * DIQQAT: bu qiymatga XAVFSIZLIK QARORI uchun to'liq ishonib bo'lmaydi.
 * `x-forwarded-for` sarlavhasini klient o'zi yuborishi mumkin. U faqat
 * ishonchli proxy (Railway, Cloudflare, Nginx) orqasida to'g'ri bo'ladi,
 * chunki proxy o'z qiymatini qo'shadi.
 *
 * Shu sababli IP faqat quyidagilar uchun ishlatiladi:
 *   • audit log (kim qayerdan kirdi — taxminiy ma'lumot)
 *   • rate limiting (aylanib o'tish mumkin, lekin ko'pchilikni to'xtatadi)
 *
 * Autentifikatsiya yoki ruxsat IP'ga TAYANMAYDI.
 */
export async function getRequestInfo(): Promise<RequestInfo> {
  const headerList = await headers();

  // Railway va ko'p platformalar `x-forwarded-for` ishlatadi.
  // Format: "klient, proxy1, proxy2" — birinchisi klient.
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    // Cloudflare
    headerList.get("cf-connecting-ip") ||
    null;

  return {
    ip: ip || null,
    userAgent: headerList.get("user-agent"),
  };
}
