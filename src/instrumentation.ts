/**
 * Server ishga tushganda bir marta bajariladigan kod.
 *
 * Next.js `register()` funksiyasini server start bo'lganda chaqiradi. Spec
 * talabi — "birinchi deploy'da administrator avtomatik yaratilsin" — aynan
 * shu yerga to'g'ri keladi:
 *
 *  • Docker entrypoint'ga `tsx` va devDependencies olib kirish kerak emas
 *  • migratsiyalardan keyin, so'rovlarni qabul qilishdan oldin ishlaydi
 *  • `bootstrapSystem` idempotent, ya'ni har restartda xavfsiz
 *
 * MUHIM: xatolik butun ilovani yiqitmaydi. Agar database hali tayyor
 * bo'lmasa (migratsiya ketmoqda), sayt ishlashda davom etadi va admin
 * keyinroq `npm run bootstrap` bilan yaratiladi.
 */

export async function register() {
  // `next build` paytida ham chaqirilishi mumkin — o'sha paytda database
  // mavjud bo'lmaydi va bootstrap qilishning ma'nosi yo'q.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Edge runtime'da Prisma ishlamaydi. Faqat Node.js serverida bajaramiz.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // Dinamik import: bu modul faqat kerak bo'lganda yuklanadi, shu bilan
    // Edge bundle'ga Prisma tortilib kirmaydi.
    const { bootstrapSystem } = await import("@/lib/auth/bootstrap");

    const result = await bootstrapSystem();

    if (result.superAdmin === "created" || result.wallets > 0) {
      console.info("[bootstrap] Tizim tayyorlandi:");
      for (const message of result.messages) {
        console.info(`  → ${message}`);
      }
      if (result.wallets > 0) {
        console.info(`  → ${result.wallets} ta tizim hamyoni yaratildi`);
      }
    }

    if (result.superAdmin === "skipped") {
      console.warn(
        "[bootstrap] Super admin yaratilmadi. " +
          "OZODFLOW_ADMIN_EMAIL va OZODFLOW_ADMIN_PASSWORD ni to'ldiring."
      );
    }
  } catch (error) {
    // Bilib turib yutamiz: bootstrap muvaffaqiyatsizligi saytni to'xtatmasligi
    // kerak. Sabab log'da qoladi.
    console.error("[bootstrap] Tizimni tayyorlash bajarilmadi:", error);
  }
}
