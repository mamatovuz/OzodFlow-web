/**
 * MA'LUMOTNOMA SEED TESTLARI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA BU TESTLAR KERAK
 *
 *  Railway'da database BO'SH volume'da yaratiladi. Migratsiyalar jadval
 *  yasaydi, lekin jadvallar bo'sh bo'ladi. Ya'ni seed ishlamasa sayt
 *  ochiladi-yu:
 *
 *    • xizmatlar katalogi bo'm-bo'sh chiqadi
 *    • komissiya sozlamasi topilmaydi
 *    • developer testi uchun savol yo'q
 *
 *  Va bu xato hech qayerda ko'rinmaydi — sayt "ishlayapti".
 *
 *  Shu sababli tekshiriladi: bo'sh databaseda seed to'liq bajariladi,
 *  ikkinchi chaqirishda esa TAKRORLANMAYDI (har server startda yuzlab
 *  so'rov yuborilmasligi kerak).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { setupTestDatabase, type TestDatabase } from "../testing/test-db";

type DbModule = typeof import("../db");
type SeedModule = typeof import("./index");

let dbModule: DbModule;
let seed: SeedModule;

let testDb: TestDatabase;

before(async () => {
  testDb = setupTestDatabase("seed");

  dbModule = await import("../db");
  seed = await import("./index");
});

after(async () => {
  await dbModule?.db.$disconnect();
  testDb?.cleanup();
});

describe("seedReferenceData", () => {
  it("bo'sh databaseda ma'lumotnomani to'liq yozadi", async () => {
    const { db } = dbModule;

    // Boshlanishida hammasi bo'sh — Railway'ning birinchi starti.
    assert.equal(await db.category.count(), 0);
    assert.equal(await db.setting.count(), 0);

    const result = await seed.seedReferenceData();

    assert.equal(result.status, "applied");
    assert.ok(result.catalog.categories > 0, "Kategoriya yozilmadi");
    assert.ok(result.catalog.services > 0, "Xizmat yozilmadi");
    assert.ok(result.skills > 0, "Ko'nikma yozilmadi");
    assert.ok(result.badges > 0, "Nishon yozilmadi");
    assert.ok(result.questions > 0, "Test savoli yozilmadi");

    // Databaseda haqiqatan turganini tekshiramiz.
    assert.equal(await db.category.count(), result.catalog.categories);
    assert.ok((await db.service.count()) > 0);
  });

  it("komissiya sozlamasi yozildi — pul mantig'i shunga tayanadi", async () => {
    const setting = await dbModule.db.setting.findUnique({
      where: { key: "payments.commission_bps" },
      select: { value: true },
    });

    assert.ok(setting, "payments.commission_bps yo'q — komissiya hisoblanmaydi");

    const bps = Number(JSON.parse(setting.value));
    assert.ok(
      Number.isInteger(bps) && bps >= 0 && bps <= 5000,
      `Komissiya qiymati mantiqsiz: ${bps}`
    );
  });

  it("ikkinchi chaqirishda takrorlamaydi", async () => {
    // Versiya belgisi qo'yilgan — seed o'tkazib yuborilishi kerak.
    const result = await seed.seedReferenceData();

    assert.equal(result.status, "skipped");
    if (result.status === "skipped") {
      assert.equal(result.version, seed.REFERENCE_DATA_VERSION);
    }
  });

  it("`force` bilan belgiga qaramaydi va dublikat yaratmaydi", async () => {
    const { db } = dbModule;

    const before = {
      categories: await db.category.count(),
      services: await db.service.count(),
      skills: await db.skill.count(),
    };

    const result = await seed.seedReferenceData({ force: true });
    assert.equal(result.status, "applied");

    // IDEMPOTENTLIK: sonlar o'zgarmasligi kerak.
    assert.equal(await db.category.count(), before.categories);
    assert.equal(await db.service.count(), before.services);
    assert.equal(await db.skill.count(), before.skills);
  });

  it("admin o'zgartirgan sozlama qiymatini tiklab yubormaydi", async () => {
    const { db } = dbModule;

    // Admin komissiyani 12% qildi.
    await db.setting.update({
      where: { key: "payments.commission_bps" },
      data: { value: JSON.stringify(1200) },
    });

    await seed.seedReferenceData({ force: true });

    const setting = await db.setting.findUnique({
      where: { key: "payments.commission_bps" },
      select: { value: true },
    });

    assert.equal(
      Number(JSON.parse(setting?.value ?? "0")),
      1200,
      "Seed admin o'zgartirgan komissiyani qaytarib yubordi — " +
        "bu jimgina moliyaviy o'zgarish"
    );
  });

  it("versiya oshsa qayta yoziladi", async () => {
    const { db } = dbModule;

    // Belgini eski versiyaga tushiramiz — seed ma'lumoti yangilangan
    // holatni taqlid qilamiz.
    await db.setting.update({
      where: { key: "system.reference_data_version" },
      data: { value: JSON.stringify(seed.REFERENCE_DATA_VERSION - 1) },
    });

    const result = await seed.seedReferenceData();
    assert.equal(result.status, "applied");

    // Belgi yangi versiyaga ko'tarilgan bo'lishi kerak.
    const marker = await db.setting.findUnique({
      where: { key: "system.reference_data_version" },
      select: { value: true },
    });

    assert.equal(
      Number(JSON.parse(marker?.value ?? "0")),
      seed.REFERENCE_DATA_VERSION
    );
  });
});
