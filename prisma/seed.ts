/**
 * Databaseni boshlang'ich ma'lumot bilan to'ldirish.
 *
 *   npm run db:seed
 *
 * Bu fayl faqat CHIQISHNI chizadi. Mantiq `src/lib/seed/index.ts` da —
 * chunki uni server ishga tushganda ham chaqirish kerak
 * (`src/instrumentation.ts`). Ikki nusxa mantiq bo'lsa ular ertami-kechmi
 * bir-biridan uzoqlashadi.
 *
 * IDEMPOTENT: necha marta ishga tushirilsa ham dublikat yaratmaydi va
 * admin o'zgartirgan sozlamalarni tiklab yubormaydi.
 */

import { bootstrapSystem } from "@/lib/auth/bootstrap";
import { db } from "@/lib/db";
import { seedReferenceData } from "@/lib/seed";

async function main() {
  console.log("\n  OzodFlow — seed boshlandi\n");

  // `force`: qo'lda ishga tushirilganda versiya belgisiga qaramaymiz.
  // Foydalanuvchi buyruq bergan bo'lsa, u bajarilishini kutadi.
  const seed = await seedReferenceData({ force: true });

  if (seed.status === "applied") {
    console.log(
      `  ✓ Sozlamalar        ${seed.settings.created} yangi, ${seed.settings.kept} mavjud (o'zgarmadi)`
    );
    console.log(`  ✓ Ko'nikmalar       ${seed.skills} ta`);
    console.log(
      `  ✓ Katalog           ${seed.catalog.categories} kategoriya, ${seed.catalog.services} xizmat`
    );
    console.log(`  ✓ Nishonlar         ${seed.badges} ta`);
    console.log(`  ✓ Test savollari    ${seed.questions} ta`);
  }

  const bootstrap = await bootstrapSystem();
  console.log(`  ✓ Tizim hamyonlari  ${bootstrap.wallets} yangi`);

  const adminLabel = {
    created: "yaratildi",
    exists: "allaqachon mavjud",
    skipped: "yaratilmadi",
  }[bootstrap.superAdmin];
  console.log(`  ✓ Super admin       ${adminLabel}`);

  if (bootstrap.messages.length > 0) {
    console.log("");
    for (const message of bootstrap.messages) {
      console.log(`    → ${message}`);
    }
  }

  console.log("\n  Seed tugadi.\n");
}

main()
  .catch((error) => {
    console.error("\n  Seed bajarilmadi:\n");
    console.error(error);
    // Nol bo'lmagan chiqish kodi — CI/CD seed muvaffaqiyatsizligini sezishi kerak.
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
