import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Healthcheck — deploy platformasi (Railway, Docker, Kubernetes) konteyner
 * tayyor bo'lganini shu manzil orqali biladi.
 *
 * Database ulanishi ham tekshiriladi: server ko'tarilgan, lekin baza
 * ochilmagan holat "sog'lom" hisoblanmasligi kerak — aks holda platforma
 * ishlamaydigan versiyaga trafik yuboradi.
 *
 * Javob ATAYLAB kambag'al: versiya, migratsiya holati yoki xato matni
 * berilmaydi. Bu manzil autentifikatsiyasiz ochiq, shuning uchun tizim
 * haqida ma'lumot chiqarmasligi kerak.
 */

// Har so'rovda haqiqiy tekshiruv bo'lishi kerak — keshlanmaydi.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Eng arzon so'rov: ulanish tirikligini tekshiradi, ma'lumot o'qimaydi.
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[health] Database ulanmadi:", error);

    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
