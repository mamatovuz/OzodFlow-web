/**
 * Databaseni boshlang'ich ma'lumot bilan to'ldirish.
 *
 *   npm run db:seed
 *
 * IDEMPOTENT: necha marta ishga tushirilsa ham dublikat yaratmaydi va
 * admin o'zgartirgan matnlarni tiklab yubormaydi. Shuning uchun uni har
 * deploy'dan keyin xavfsiz chaqirish mumkin.
 *
 * Tartib muhim: sozlamalar birinchi bo'ladi, chunki `bootstrapSystem`
 * valyuta kabi qiymatlarni ulardan oladi.
 */

import { db } from "@/lib/db";
import { bootstrapSystem } from "@/lib/auth/bootstrap";
import { DEFAULT_SETTINGS } from "@/lib/settings";

import { seedBadges } from "./seed/badges";
import { seedCatalog } from "./seed/catalog";
import { seedQuestions } from "./seed/questions";
import { seedSkills } from "./seed/skills";

/**
 * Tizim sozlamalari.
 *
 * MUHIM: mavjud sozlama QAYTA YOZILMAYDI. Admin komissiyani 12% qilgan
 * bo'lsa, seed uni 15% ga qaytarib yuborishi mumkin emas — bu jimgina
 * moliyaviy o'zgarish bo'lardi.
 */
async function seedSettings(): Promise<{ created: number; kept: number }> {
  let created = 0;
  let kept = 0;

  for (const setting of DEFAULT_SETTINGS) {
    const existing = await db.setting.findUnique({
      where: { key: setting.key },
      select: { key: true },
    });

    if (existing) {
      // Faqat tavsif va yorliqni yangilaymiz — qiymatga tegmaymiz.
      await db.setting.update({
        where: { key: setting.key },
        data: {
          label: setting.label,
          description: setting.description,
          group: setting.group,
          isProtected: setting.isProtected,
        },
      });
      kept += 1;
      continue;
    }

    await db.setting.create({
      data: {
        key: setting.key,
        value: JSON.stringify(setting.value),
        group: setting.group,
        label: setting.label,
        description: setting.description,
        isProtected: setting.isProtected,
      },
    });
    created += 1;
  }

  return { created, kept };
}

async function main() {
  console.log("\n  OzodFlow — seed boshlandi\n");

  const settings = await seedSettings();
  console.log(
    `  ✓ Sozlamalar        ${settings.created} yangi, ${settings.kept} mavjud (o'zgarmadi)`
  );

  const skills = await seedSkills();
  console.log(`  ✓ Ko'nikmalar       ${skills} ta`);

  const catalog = await seedCatalog();
  console.log(
    `  ✓ Katalog           ${catalog.categories} kategoriya, ${catalog.services} xizmat`
  );

  const badges = await seedBadges();
  console.log(`  ✓ Nishonlar         ${badges} ta`);

  const questions = await seedQuestions();
  console.log(`  ✓ Test savollari    ${questions} ta`);

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
