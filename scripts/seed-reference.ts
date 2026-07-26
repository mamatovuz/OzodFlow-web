/**
 * FAQAT MA'LUMOTNOMA MA'LUMOTINI YOZADI
 *
 *   npm run db:seed:reference
 *
 * Farqi `npm run db:seed` dan: super admin YARATILMAYDI va tizim
 * hamyonlari tegilmaydi.
 *
 * Nima uchun kerak: Docker build bosqichida `/services` sahifalari
 * statik yasaladi va katalogni databasedan o'qiydi. O'sha vaqtinchalik
 * databaseda admin ham, hamyon ham keraksiz — ular runtime'da
 * `src/instrumentation.ts` orqali haqiqiy databaseda yaratiladi.
 *
 * Build bosqichida bajarilmaydigan ishni bajarmaslik muhim: har
 * qo'shimcha qadam build'ni yiqitishi mumkin bo'lgan yana bitta joy.
 */

import { db } from "@/lib/db";
import { seedReferenceData } from "@/lib/seed";

async function main() {
  const seed = await seedReferenceData({ force: true });

  if (seed.status === "applied") {
    console.log(
      `Ma'lumotnoma yozildi: ${seed.catalog.categories} kategoriya, ` +
        `${seed.catalog.services} xizmat, ${seed.skills} ko'nikma, ` +
        `${seed.badges} nishon, ${seed.questions} savol, ` +
        `${seed.settings.created + seed.settings.kept} sozlama`
    );
  }
}

main()
  .catch((error) => {
    console.error("Ma'lumotnoma yozilmadi:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
