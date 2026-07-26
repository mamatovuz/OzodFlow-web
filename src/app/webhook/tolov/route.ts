import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { settleGatewayPayment } from "@/lib/payments";
import { consume, rateLimitKey } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/request-info";

/**
 * inPAY WEBHOOK — /webhook/tolov
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ENG MUHIM NARSA: BU SO'ROVGA ISHONILMAYDI
 *
 *  inPAY webhook'ida IMZO YO'Q — hujjatda signature, HMAC yoki umumiy
 *  maxfiy kalit ko'rsatilmagan. Manzil esa ochiq
 *  (https://ozodflow.uz/webhook/tolov).
 *
 *  Ya'ni istalgan odam quyidagini yuborishi mumkin:
 *
 *      POST /webhook/tolov
 *      { "status": "success", "order_id": "1ff2f5a6d66f6e9c",
 *        "amount": "100000000.00", "transaction_id": 149 }
 *
 *  Agar biz shu tanaga ishonib hamyonga pul qo'shsak — bu bepul pul
 *  ishlab chiqaruvchi teshik bo'lardi.
 *
 *  HIMOYA:
 *    1. Tanadan FAQAT `order_id` olinadi. Summa, holat, tranzaksiya id —
 *       hammasi e'tiborga OLINMAYDI.
 *    2. `settleGatewayPayment` shlyuzning o'zidan `/transactions/`
 *       orqali mustaqil tasdiq oladi.
 *    3. Summa lokal yozuv bilan solishtiriladi.
 *    4. Rate limit — soxta so'rovlar bilan bizni shlyuzga so'rov
 *       yuborishga majburlab bo'lmaydi (shlyuzda soatiga 100 so'rov
 *       limiti bor, uni tugatib qo'yish mumkin edi).
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
 * `order_id` dan boshqa hamma maydon IXTIYORIY va ishlatilmaydi —
 * ular faqat log uchun saqlanadi. Shlyuz yangi maydon qo'shsa so'rov
 * rad etilmasligi kerak.
 */
const webhookSchema = z.object({
  order_id: z.string().min(1).max(128),
  status: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  transaction_id: z.union([z.string(), z.number()]).optional(),
  created_at: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const info = await getRequestInfo();

  /**
   * Rate limit.
   *
   * Bu manzil ochiq, ya'ni uni bombardimon qilish mumkin. Har so'rov
   * shlyuzga tashqi so'rov yuborishga olib keladi va shlyuzda soatiga
   * 100 so'rov limiti bor — cheklovsiz bo'lsa hujumchi bizning
   * limitimizni tugatib, haqiqiy to'lovlarni to'xtatib qo'yardi.
   *
   * Limit IP bo'yicha: haqiqiy webhook bitta manbadan keladi.
   */
  const limit = consume(
    rateLimitKey("webhook_inpay", { ip: info.ip }),
    // Oynada 60 so'rov — haqiqiy trafik uchun yetarli, hujum uchun kam.
    { windowMs: 60_000, max: 60, blockMs: 5 * 60_000 }
  );

  if (!limit.ok) {
    // 429 — inPAY keyinroq qayta yuboradi, ya'ni haqiqiy webhook
    // yo'qolmaydi.
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
    // 400 — qayta yuborishning ma'nosi yo'q, tana o'zgarmaydi.
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orderId = parsed.data.order_id;

  // ── Yopish ─────────────────────────────────────────────────────────────
  try {
    const result = await settleGatewayPayment({
      orderId,
      webhookPayload: payload,
    });

    // Log — nizo yoki tekshiruvda kerak bo'ladi.
    switch (result.status) {
      case "credited":
        console.info(
          `[webhook/tolov] Buyurtma ${orderId} yopildi, hamyon to'ldirildi`
        );
        break;
      case "already_settled":
        console.info(`[webhook/tolov] Buyurtma ${orderId} allaqachon yopilgan`);
        break;
      case "unknown_order":
        console.warn(`[webhook/tolov] Notanish buyurtma: ${orderId}`);
        break;
      case "not_paid":
        // Eng muhim log: soxta webhook aynan shu yerga tushadi.
        console.warn(
          `[webhook/tolov] Buyurtma ${orderId} shlyuzda to'langan emas ` +
            `(holat: ${result.gatewayStatus}) — pul qo'shilmadi`
        );
        break;
    }
  } catch (error) {
    console.error(`[webhook/tolov] Buyurtma ${orderId} qayta ishlanmadi:`, error);

    /**
     * 500 QAYTARAMIZ — inPAY qayta yuborsin.
     *
     * Bu CHECKOUT.UZ'dan asosiy farq: inPAY hujjatida "HTTP 200
     * qaytarmasa qayta urinib ko'radi" deb yozilgan. Ya'ni tarmoq
     * uzilishi yoki database band bo'lgan holatda 500 qaytarish
     * FOYDALI — to'lov yo'qolmaydi.
     *
     * Faqat KUTILMAGAN xatoda: yuqoridagi to'rt natija (soxta webhook
     * ham shunda) 200 oladi, chunki ularni qayta yuborish hech narsani
     * o'zgartirmaydi.
     *
     * Zaxira yo'l ham bor: mijoz hamyon sahifasida holatni qo'lda
     * tekshirishi mumkin (`recheckPendingGatewayPayments`).
     */
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  /**
   * Javob tanasi ATAYLAB bo'sh: webhook yuboruvchiga bizning ichki
   * holatimiz haqida ma'lumot berilmaydi. Soxta so'rov yuborgan odam
   * "bu buyurtma bor" yoki "yo'q" degan javobni bilmasligi kerak.
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
  return NextResponse.json({ ok: true, endpoint: "inpay webhook" });
}
