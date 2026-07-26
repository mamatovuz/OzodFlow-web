/**
 * Server ishga tushganda bir marta bajariladigan kod.
 *
 * Next.js `register()` funksiyasini server start bo'lganda chaqiradi. Ikki
 * ish shu yerda bajariladi:
 *
 *  1. MA'LUMOTNOMA — xizmat katalogi, ko'nikmalar, sozlamalar, nishonlar.
 *     Railway'da database bo'sh volume'da yaratiladi: migratsiyalar
 *     jadval yasaydi, lekin JADVALLAR BO'SH bo'ladi. Seed ishlatilmasa
 *     sayt ochiladi-yu, katalog bo'm-bo'sh chiqadi.
 *
 *  2. SUPER ADMIN — spec talabi: "birinchi deploy'da administrator
 *     avtomatik yaratilsin".
 *
 * Nega aynan bu yer:
 *  • Docker entrypoint'ga `tsx` va devDependencies olib kirish kerak emas
 *  • migratsiyalardan keyin, so'rovlarni qabul qilishdan oldin ishlaydi
 *  • ikkalasi ham idempotent, ya'ni har restartda xavfsiz
 *
 * MUHIM: xatolik butun ilovani yiqitmaydi. Agar database hali tayyor
 * bo'lmasa, sayt ishlashda davom etadi va seed'ni `npm run db:seed`,
 * adminni `npm run bootstrap` bilan qo'lda bajarish mumkin.
 */

export async function register() {
  // `next build` paytida ham chaqirilishi mumkin. Build vaqtida database
  // vaqtinchalik va tashlab yuboriladi — unga yozishning ma'nosi yo'q.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Edge runtime'da Prisma ishlamaydi. Faqat Node.js serverida bajaramiz.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // ── 1. Ma'lumotnoma ────────────────────────────────────────────────────
  try {
    const { seedReferenceData } = await import("@/lib/seed");

    const seed = await seedReferenceData();

    if (seed.status === "applied") {
      console.info(
        `[seed] Ma'lumotnoma yozildi: ${seed.catalog.categories} kategoriya, ` +
          `${seed.catalog.services} xizmat, ${seed.skills} ko'nikma, ` +
          `${seed.questions} savol`
      );
    }
  } catch (error) {
    /**
     * Bilib turib yutamiz.
     *
     * Katalog bo'lmasa sayt kambag'al ko'rinadi, lekin ISHLAYDI: kirish,
     * loyiha yaratish, to'lov — hammasi katalogga bog'liq emas. Saytni
     * butunlay yopishdan ko'ra shunisi yaxshi.
     */
    console.error("[seed] Ma'lumotnoma yozilmadi:", error);
  }

  // ── 2. Super admin va tizim hamyonlari ────────────────────────────────
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
