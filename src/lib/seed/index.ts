/**
 * MA'LUMOTNOMA MA'LUMOTLARINI DATABASEGA YOZISH
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BU KOD ILOVA ICHIDA, `prisma/` DA EMAS
 *
 *  Xizmat katalogi, ko'nikmalar, nishonlar va test savollari —
 *  MA'LUMOTNOMA ma'lumoti: u foydalanuvchi yaratmaydi, kodda turadi.
 *
 *  Uni ikki joyda kerak bo'ladi:
 *
 *    1. `npm run db:seed` — ishlab chiqishda, qo'lda
 *    2. SERVER ISHGA TUSHGANDA — production'da
 *
 *  Ikkinchisi majburiy: Railway'da database bo'sh volume'da yaratiladi.
 *  Migratsiyalar jadval yasaydi, lekin JADVALLAR BO'SH bo'ladi. Ya'ni
 *  seed ishlatilmasa sayt ochiladi-yu, katalog bo'm-bo'sh chiqadi va
 *  komissiya sozlamasi topilmaydi.
 *
 *  Shu sababli kod `src/` ichida: standalone bundle'ga tushadi va
 *  `src/instrumentation.ts` uni chaqirishi mumkin. `prisma/seed/` da
 *  qolsa, u faqat `tsx` va devDependencies bilan ishlardi — production
 *  image'da ikkalasi ham yo'q.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";

import { seedBadges } from "./badges";
import { seedCatalog } from "./catalog";
import { seedQuestions } from "./questions";
import { seedSkills } from "./skills";

export { seedBadges, seedCatalog, seedQuestions, seedSkills };

/**
 * Ma'lumotnoma versiyasi.
 *
 * Har server startda yuzlab so'rov yubormaslik uchun databasega belgi
 * qo'yiladi. Belgi shu songa teng bo'lsa seed O'TKAZIB YUBORILADI.
 *
 * SEED MA'LUMOTI O'ZGARSA BU SONNI OSHIRING — aks holda yangi
 * kategoriya yoki savol production'ga tushmaydi.
 */
export const REFERENCE_DATA_VERSION = 1;

const VERSION_KEY = "system.reference_data_version";

/**
 * Tizim sozlamalari.
 *
 * MUHIM: mavjud sozlamaning QIYMATI QAYTA YOZILMAYDI. Admin komissiyani
 * 12% qilgan bo'lsa, seed uni 15% ga qaytarib yuborishi mumkin emas —
 * bu jimgina moliyaviy o'zgarish bo'lardi. Faqat yorliq va tavsif
 * yangilanadi.
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

export type SeedSummary = {
  settings: { created: number; kept: number };
  skills: number;
  catalog: { categories: number; services: number };
  badges: number;
  questions: number;
};

export type SeedResult =
  | ({ status: "applied" } & SeedSummary)
  /** Belgi mos keldi — hech narsa qilinmadi */
  | { status: "skipped"; version: number };

/**
 * Ma'lumotnoma ma'lumotini yozadi.
 *
 * IDEMPOTENT: necha marta chaqirilsa ham dublikat yaratmaydi.
 *
 * @param force Versiya belgisini e'tiborga olmaydi. `npm run db:seed`
 *   shu bilan chaqiriladi — qo'lda ishga tushirilganda har doim
 *   bajarilishi kutiladi.
 */
export async function seedReferenceData(
  options: { force?: boolean } = {}
): Promise<SeedResult> {
  if (!options.force) {
    const marker = await db.setting.findUnique({
      where: { key: VERSION_KEY },
      select: { value: true },
    });

    if (marker) {
      // Qiymat JSON matn sifatida saqlanadi.
      const stored = Number(JSON.parse(marker.value));

      if (stored === REFERENCE_DATA_VERSION) {
        return { status: "skipped", version: stored };
      }
    }
  }

  // Tartib MUHIM: sozlamalar birinchi, chunki katalog narxlari va
  // boshqa qiymatlar ularga tayanadi.
  const settings = await seedSettings();
  const skills = await seedSkills();
  const catalog = await seedCatalog();
  const badges = await seedBadges();
  const questions = await seedQuestions();

  // Belgi ENG OXIRIDA qo'yiladi. Yuqorida xato bo'lsa belgi yozilmaydi
  // va keyingi startda qayta urinib ko'riladi — yarim to'ldirilgan
  // database "tayyor" deb belgilanib qolmasligi kerak.
  await db.setting.upsert({
    where: { key: VERSION_KEY },
    update: { value: JSON.stringify(REFERENCE_DATA_VERSION) },
    create: {
      key: VERSION_KEY,
      value: JSON.stringify(REFERENCE_DATA_VERSION),
      group: "system",
      label: "Ma'lumotnoma versiyasi",
      description:
        "Katalog va ko'nikmalar qaysi versiyada yozilgani. Qo'lda tegilmaydi.",
      isProtected: true,
    },
  });

  return { status: "applied", settings, skills, catalog, badges, questions };
}
