import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { settleCheckoutPayment } from "@/lib/payments";
import { consume, rateLimitKey } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";

/**
 * CHECKOUT.UZ WEBHOOK — /webhook/tolov
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ENG MUHIM NARSA: BU SO'ROVGA ISHONILMAYDI
 *
 *  CHECKOUT.UZ webhook'ida IMZO YO'Q — hujjatda signature, HMAC yoki
 *  umumiy maxfiy kalit ko'rsatilmagan. Manzil esa ochiq
 *  (https://ozodflow.uz/webhook/tolov).
 *
 *  Ya'ni istalgan odam quyidagini yuborishi mumkin:
 *
 *      POST /webhook/tolov
 *      { "event": "payment_confirmed", "data": { "order_id": 45180,
 *        "amount": 10000000, "status": "paid" } }
 *
 *  Agar biz shu tanaga ishonib hamyonga pul qo'shsak — bu bepul pul
 *  ishlab chiqaruvchi teshik bo'lardi.
 *
 *  HIMOYA:
 *    1. Tanadan FAQAT `order_id` olinadi. Summa, holat, valyuta —
 *       hammasi e'tiborga OLINMAYDI.
 *    2. `settleCheckoutPayment` shlyuzning o'zidan `/status_payment`
 *       orqali mustaqil tasdiq oladi.
 *    3. Summa lokal yozuv bilan solishtiriladi.
 *    4. `shop_id` sozlangan bo'lsa, u ham tekshiriladi.
 *    5. Rate limit — soxta so'rovlar bilan bizni shlyuzga so'rov
 *       yuborishga majburlab bo'lmaydi.
 *
 *  Natijada soxta webhook hech narsa qilmaydi: shlyuz "pending" deb
 *  javob beradi va pul qo'shilmaydi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Runtime `nodejs` — Prisma va shlyuzga so'rov kerak.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook tanasi.
 *
 * `passthrough` ATAYLAB: shlyuz yangi maydon qo'shsa so'rov rad
 * etilmasligi kerak. Bizga faqat `data.order_id` kerak, qolgani
 * o'zgarishi mumkin.
 */
const webhookSchema = z.object({
  event: z.string().optional(),
  shop_id: z.number().int().optional(),
  payment_system: z.string().optional(),
  data: z.object({
    order_id: z.number().int().positive(),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const info = await getRequestInfo();

  /**
   * Rate limit.
   *
   * Bu manzil ochiq, ya'ni uni bombardimon qilish mumkin. Har so'rov
   * shlyuzga tashqi so'rov yuborishga olib keladi, shuning uchun
   * cheklov shart — aks holda bizni shlyuz limitiga urib qo'yishadi.
   *
   * Limit IP bo'yicha: haqiqiy webhook bitta manbadan keladi.
   */
  const limit = consume(
    rateLimitKey("webhook_checkout", { ip: info.ip }),
    // Oynada 60 so'rov — haqiqiy trafik uchun yetarli, hujum uchun kam.
    { windowMs: 60_000, max: 60, blockMs: 5 * 60_000 }
  );

  if (!limit.ok) {
    // 429 — shlyuz keyinroq qayta yuborishi mumkin (hozircha yubormaydi,
    // lekin to'g'ri kod qaytarish kerak).
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  // ── Tanani o'qish ──────────────────────────────────────────────────────
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    console.warn("[webhook/tolov] JSON bo'lmagan tana keldi");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(payload);

  if (!parsed.success) {
    console.warn(
      "[webhook/tolov] Tana kutilgan shaklda emas:",
      parsed.error.issues.map((issue) => issue.message).join(", ")
    );
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const body = parsed.data;

  // ── Kassa mosligi ──────────────────────────────────────────────────────
  // Sozlangan bo'lsa tekshiramiz. Bu imzo o'rnini bosmaydi (soxta
  // so'rovda ham to'g'ri shop_id yozish mumkin), lekin boshqa kassaning
  // webhook'i tasodifan bizga tushib qolishini oldini oladi.
  if (
    env.CHECKOUT_SHOP_ID !== undefined &&
    body.shop_id !== undefined &&
    body.shop_id !== env.CHECKOUT_SHOP_ID
  ) {
    console.warn(
      `[webhook/tolov] Boshqa kassa: ${body.shop_id} (kutilgan ${env.CHECKOUT_SHOP_ID})`
    );
    return NextResponse.json({ ok: true });
  }

  const invoiceId = body.data.order_id;

  // ── Yopish ─────────────────────────────────────────────────────────────
  try {
    const result = await settleCheckoutPayment({
      invoiceId,
      webhookPayload: payload,
    });

    // Log — nizo yoki tekshiruvda kerak bo'ladi.
    switch (result.status) {
      case "credited":
        console.info(
          `[webhook/tolov] Invoys ${invoiceId} yopildi, hamyon to'ldirildi`
        );
        break;
      case "already_settled":
        console.info(`[webhook/tolov] Invoys ${invoiceId} allaqachon yopilgan`);
        break;
      case "unknown_invoice":
        console.warn(`[webhook/tolov] Notanish invoys: ${invoiceId}`);
        break;
      case "not_paid":
        // Eng muhim log: soxta webhook aynan shu yerga tushadi.
        console.warn(
          `[webhook/tolov] Invoys ${invoiceId} shlyuzda to'langan emas ` +
            `(holat: ${result.gatewayStatus}) — pul qo'shilmadi`
        );
        break;
    }
  } catch (error) {
    // Xato bo'lsa ham 200 qaytaramiz (pastdagi izohga qarang), lekin
    // log'da to'liq sabab qoladi.
    console.error(`[webhook/tolov] Invoys ${invoiceId} qayta ishlanmadi:`, error);
  }

  /**
   * HAR DOIM 200.
   *
   * Hujjatda: "Serveringiz HTTP 200 kod bilan javob qaytarishi kifoya.
   * Hozircha muvaffaqiyatsiz urinish avtomatik qayta yuborilmaydi."
   *
   * Ya'ni xato kod qaytarsak ham qayta yuborilmaydi — foyda yo'q, lekin
   * shlyuz panelida "webhook ishlamayapti" degan xato ko'rinadi.
   *
   * Yo'qolgan webhook uchun ZAXIRA yo'l bor:
   * `recheckPendingGatewayPayments` — mijoz hamyon sahifasida holatni
   * qayta tekshirishi mumkin. Shu sababli 200 qaytarish xavfsiz.
   *
   * Javob tanasi ATAYLAB bo'sh: webhook yuboruvchiga bizning ichki
   * holatimiz haqida ma'lumot berilmaydi.
   */
  return NextResponse.json({ ok: true });
}

/**
 * GET — faqat manzil ishlayotganini tekshirish uchun.
 *
 * Shlyuz panelida manzilni saqlashda ba'zan GET bilan tekshiriladi.
 * Hech qanday amal bajarilmaydi.
 */
export function GET(): NextResponse {
  return NextResponse.json({ ok: true, endpoint: "checkout.uz webhook" });
}
