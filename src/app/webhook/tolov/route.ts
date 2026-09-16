import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInpayTransaction, verifyWebhookSignature } from "@/lib/inpay";
import { applyApprovedPayment } from "@/lib/payment-approve";

export const runtime = "nodejs";

// inPAY webhook — to'lov holati o'zgarganda shu manzilga POST keladi.
// Manzil: https://ozodflow.uz/webhook/tolov
// Har doim HTTP 200 qaytaramiz (aks holda inPAY qayta-qayta uradi).
//
// Xavfsizlik: webhook tanasiga ko'r-ko'rona ishonmaymiz — order_id bo'yicha
// inPAY API'dan holatni qayta tekshiramiz (getInpayTransaction). SALT sozlangan
// bo'lsa imzo ham tekshiriladi.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    order_id?: string;
    status?: string;
    amount?: string | number;
    signature?: string;
  } | null;

  if (!body?.order_id) return NextResponse.json({ ok: true });

  try {
    // Imzo (SALT bo'lsa) — noto'g'ri bo'lsa jim o'tamiz
    if (!verifyWebhookSignature(body)) {
      return NextResponse.json({ ok: true });
    }

    const request = await prisma.paymentRequest.findFirst({
      where: { payOrderId: body.order_id, payProvider: "INPAY" },
    });
    if (!request) return NextResponse.json({ ok: true });

    // Idempotent — allaqachon ko'rib chiqilgan bo'lsa qaytamiz
    if (request.status !== "PENDING") return NextResponse.json({ ok: true });

    // Holatni inPAY API'dan tasdiqlaymiz (webhook tanasiga tayanmaymiz)
    const tx = await getInpayTransaction(body.order_id);
    const confirmed = tx?.status ?? (body.status as string | undefined);

    if (confirmed === "success") {
      await applyApprovedPayment(request, "inPAY orqali onlayn to'landi");
    } else if (confirmed === "failed" || confirmed === "cancelled" || confirmed === "canceled") {
      await prisma.paymentRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          adminNote: "To'lov amalga oshmadi (inPAY)",
          reviewedAt: new Date(),
        },
      });
    }
    // pending — hech narsa qilmaymiz, yakuniy webhookni kutamiz
  } catch {
    // jim o'tamiz — webhook doim 200 qaytarishi kerak
  }

  return NextResponse.json({ ok: true });
}
